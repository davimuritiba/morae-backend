import type { Logger } from '../../../../../shared/application/logger.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import { User } from '../../../domain/entities/user.entity.js';
import { PropertyOwner } from '../../../domain/entities/property-owner.entity.js';
import { CpfAlreadyInUseError } from '../../../domain/errors/cpf-already-in-use.error.js';
import { EmailAlreadyInUseError } from '../../../domain/errors/email-already-in-use.error.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { PropertyOwnerRepository } from '../../../domain/repositories/property-owner.repository.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { Password } from '../../../domain/value-objects/password.vo.js';
import { Phone } from '../../../domain/value-objects/phone.vo.js';
import { UserProfileDetails } from '../../../domain/entities/user-profile-details.entity.js';
import type { UserProfileDetailsRepository } from '../../../domain/repositories/user-profile-details.repository.js';
import type { Hasher } from '../../ports/hasher.port.js';
import type { SendEmailVerificationUseCase } from '../send-email-verification/send-email-verification.use-case.js';
import type { RegisterPropertyOwnerInput } from './register-property-owner.input.js';
import type { RegisterPropertyOwnerOutput } from './register-property-owner.output.js';

export class RegisterPropertyOwnerUseCase implements UseCase<
  RegisterPropertyOwnerInput,
  RegisterPropertyOwnerOutput
> {
  constructor(
    private readonly users: UserRepository,
    private readonly propertyOwners: PropertyOwnerRepository,
    private readonly hasher: Hasher,
    private readonly unitOfWork: UnitOfWork,
    private readonly sendEmailVerification: SendEmailVerificationUseCase,
    private readonly logger: Logger,
    // Opcional para manter compatíveis os testes que não usam dados de perfil.
    private readonly profileDetails?: UserProfileDetailsRepository,
  ) {}

  async execute(
    input: RegisterPropertyOwnerInput,
  ): Promise<RegisterPropertyOwnerOutput> {
    const email = Email.create(input.email);
    const cpf = Cpf.create(input.cpf);
    const password = Password.create(input.password);
    const phone = input.phone ? Phone.create(input.phone) : null;
    // Valida os dados de perfil antes de tocar no banco; o id real vem depois.
    const draftDetails = input.profileDetails
      ? UserProfileDetails.create('', input.profileDetails)
      : null;

    if (await this.users.existsByEmail(email))
      throw new EmailAlreadyInUseError();
    if (await this.users.existsByCpf(cpf)) throw new CpfAlreadyInUseError();

    const user = User.create({
      name: input.name,
      email,
      cpf,
      passwordHash: await this.hasher.hash(password.value),
      phone,
      profileData: input.profileData,
    });
    const propertyOwner = PropertyOwner.create({ userId: user.id });

    const details =
      draftDetails && !draftDetails.isEmpty && this.profileDetails
        ? UserProfileDetails.restore(user.id, draftDetails.data, draftDetails.updatedAt)
        : null;

    await this.unitOfWork.run(async () => {
      await this.users.save(user);
      if (details) await this.profileDetails?.save(details);
      await this.propertyOwners.save(propertyOwner);
    });

    try {
      await this.sendEmailVerification.execute({ userId: user.id });
    } catch (error) {
      this.logger.error(
        `Falha ao enviar o e-mail de verificação do usuário ${user.id}.`,
        error,
      );
    }

    return { userId: user.id, propertyOwnerId: propertyOwner.id };
  }
}
