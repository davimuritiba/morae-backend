import type { Logger } from '../../../../../shared/application/logger.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import { Student } from '../../../domain/entities/student.entity.js';
import { StudentCompatibilityAnswers } from '../../../domain/entities/student-compatibility-answers.entity.js';
import { User } from '../../../domain/entities/user.entity.js';
import { CpfAlreadyInUseError } from '../../../domain/errors/cpf-already-in-use.error.js';
import { EmailAlreadyInUseError } from '../../../domain/errors/email-already-in-use.error.js';
import { EnrollmentNumberAlreadyInUseError } from '../../../domain/errors/enrollment-number-already-in-use.error.js';
import type { StudentRepository } from '../../../domain/repositories/student.repository.js';
import type { PropertyOwnerRepository } from '../../../domain/repositories/property-owner.repository.js';
import { PropertyOwner } from '../../../domain/entities/property-owner.entity.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { AcademicPeriod } from '../../../domain/value-objects/academic-period.vo.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { EnrollmentNumber } from '../../../domain/value-objects/enrollment-number.vo.js';
import { Password } from '../../../domain/value-objects/password.vo.js';
import { Phone } from '../../../domain/value-objects/phone.vo.js';
import { UserProfileDetails } from '../../../domain/entities/user-profile-details.entity.js';
import type { UserProfileDetailsRepository } from '../../../domain/repositories/user-profile-details.repository.js';
import type { Hasher } from '../../ports/hasher.port.js';
import type { SendEmailVerificationUseCase } from '../send-email-verification/send-email-verification.use-case.js';
import type { RegisterStudentInput } from './register-student.input.js';
import type { RegisterStudentOutput } from './register-student.output.js';

// Cadastro de estudante: cria a conta (User) e o perfil acadêmico (Student)
// juntos e envia o link de verificação do e-mail. A verificação do vínculo
// com a UFAL começa como PENDING.
export class RegisterStudentUseCase implements UseCase<
  RegisterStudentInput,
  RegisterStudentOutput
> {
  constructor(
    private readonly users: UserRepository,
    private readonly students: StudentRepository,
    private readonly propertyOwners: PropertyOwnerRepository,
    private readonly hasher: Hasher,
    private readonly unitOfWork: UnitOfWork,
    private readonly sendEmailVerification: SendEmailVerificationUseCase,
    private readonly logger: Logger,
    // Opcional para manter compatíveis os testes que não usam dados de perfil.
    private readonly profileDetails?: UserProfileDetailsRepository,
  ) {}

  async execute(input: RegisterStudentInput): Promise<RegisterStudentOutput> {
    // 1. Formato: os VOs lançam erro de domínio antes de qualquer acesso ao banco.
    const email = Email.create(input.email);
    const cpf = Cpf.create(input.cpf);
    const password = Password.create(input.password);
    const phone = input.phone ? Phone.create(input.phone) : null;
    // Valida os dados de perfil antes de tocar no banco; o id real vem depois.
    const draftDetails = input.profileDetails
      ? UserProfileDetails.create('', input.profileDetails)
      : null;
    const enrollmentNumber = EnrollmentNumber.create(input.enrollmentNumber);
    const period = AcademicPeriod.create(input.period);

    // 2. Unicidade. Em requisições simultâneas, quem garante é a constraint
    // UNIQUE do banco, via save(); aqui é a checagem com erro específico.
    if (await this.users.existsByEmail(email)) {
      throw new EmailAlreadyInUseError();
    }
    if (await this.users.existsByCpf(cpf)) {
      throw new CpfAlreadyInUseError();
    }
    if (await this.students.existsByEnrollmentNumber(enrollmentNumber)) {
      throw new EnrollmentNumberAlreadyInUseError();
    }

    // 3. Entidades. O hash vem depois das checagens por ser a etapa mais cara.
    const passwordHash = await this.hasher.hash(password.value);

    const user = User.create({
      name: input.name,
      email,
      cpf,
      passwordHash,
      phone,
    });

    const student = Student.create({
      userId: user.id,
      enrollmentNumber,
      course: input.course,
      period,
      expectedGraduation: input.expectedGraduation,
    });

    student.defineCompatibilityAnswers(
      StudentCompatibilityAnswers.create(input.compatibilityAnswers),
    );

    const propertyOwner = input.advertisesProperty
      ? PropertyOwner.create({ userId: user.id })
      : null;

    const details =
      draftDetails && !draftDetails.isEmpty && this.profileDetails
        ? UserProfileDetails.restore(user.id, draftDetails.data, draftDetails.updatedAt)
        : null;

    // 4. Persistência atômica: conta, estudante e, para ofertadores, perfil de proprietário.
    await this.unitOfWork.run(async () => {
      await this.users.save(user);
      if (details) await this.profileDetails?.save(details);
      await this.students.save(student);
      if (propertyOwner) await this.propertyOwners.save(propertyOwner);
    });

    // 5. E-mail de verificação. O cadastro já está gravado: uma falha no
    // envio não pode desfazê-lo, e o usuário pode pedir o reenvio depois.
    try {
      await this.sendEmailVerification.execute({ userId: user.id });
    } catch (error) {
      this.logger.error(
        `Falha ao enviar o e-mail de verificação do usuário ${user.id}.`,
        error,
      );
    }

    return {
      userId: user.id,
      studentId: student.id,
      ...(propertyOwner && { propertyOwnerId: propertyOwner.id }),
    };
  }
}
