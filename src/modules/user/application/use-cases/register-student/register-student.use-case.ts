import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import { Student } from '../../../domain/entities/student.entity.js';
import { User } from '../../../domain/entities/user.entity.js';
import { CpfAlreadyInUseError } from '../../../domain/errors/cpf-already-in-use.error.js';
import { EmailAlreadyInUseError } from '../../../domain/errors/email-already-in-use.error.js';
import { EnrollmentNumberAlreadyInUseError } from '../../../domain/errors/enrollment-number-already-in-use.error.js';
import type { StudentRepository } from '../../../domain/repositories/student.repository.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { AcademicPeriod } from '../../../domain/value-objects/academic-period.vo.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { EnrollmentNumber } from '../../../domain/value-objects/enrollment-number.vo.js';
import { Password } from '../../../domain/value-objects/password.vo.js';
import { Phone } from '../../../domain/value-objects/phone.vo.js';
import type { Hasher } from '../../ports/hasher.port.js';
import type { RegisterStudentInput } from './register-student.input.js';
import type { RegisterStudentOutput } from './register-student.output.js';

// Cadastro de estudante: cria a conta (User) e o perfil acadêmico (Student)
// juntos. A verificação do vínculo com a UFAL começa como PENDING.
export class RegisterStudentUseCase implements UseCase<
  RegisterStudentInput,
  RegisterStudentOutput
> {
  constructor(
    private readonly users: UserRepository,
    private readonly students: StudentRepository,
    private readonly hasher: Hasher,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: RegisterStudentInput): Promise<RegisterStudentOutput> {
    // 1. Formato: os VOs lançam erro de domínio antes de qualquer acesso ao banco.
    const email = Email.create(input.email);
    const cpf = Cpf.create(input.cpf);
    const password = Password.create(input.password);
    const phone = input.phone ? Phone.create(input.phone) : null;
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

    // 4. Persistência atômica: nunca fica um User sem o Student, nem o contrário.
    await this.unitOfWork.run(async () => {
      await this.users.save(user);
      await this.students.save(student);
    });

    return { userId: user.id, studentId: student.id };
  }
}
