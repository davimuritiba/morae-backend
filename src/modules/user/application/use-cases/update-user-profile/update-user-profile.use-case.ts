import type { Logger } from '../../../../../shared/application/logger.js';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import { CpfAlreadyInUseError } from '../../../domain/errors/cpf-already-in-use.error.js';
import { EmailAlreadyInUseError } from '../../../domain/errors/email-already-in-use.error.js';
import { EmptyUserProfileUpdateError } from '../../../domain/errors/empty-user-profile-update.error.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { Cpf } from '../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import { Phone } from '../../../domain/value-objects/phone.vo.js';
import type { SendEmailVerificationUseCase } from '../send-email-verification/send-email-verification.use-case.js';
import type { UpdateUserProfileInput } from './update-user-profile.input.js';
import type { UpdateUserProfileOutput } from './update-user-profile.output.js';

// Atualiza somente os dados básicos da conta. Senha e estado da conta nunca
// são aceitos por esta operação; uma troca de e-mail exige nova verificação.
export class UpdateUserProfileUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sendEmailVerification: Pick<
      SendEmailVerificationUseCase,
      'execute'
    >,
    private readonly logger: Logger,
  ) {}

  async execute(
    input: UpdateUserProfileInput,
  ): Promise<UpdateUserProfileOutput> {
    const { userId } = input;
    if (
      [input.name, input.email, input.cpf, input.phone].every(
        (value) => value === undefined,
      )
    ) {
      throw new EmptyUserProfileUpdateError();
    }

    const email =
      input.email === undefined ? undefined : Email.create(input.email);
    const cpf = input.cpf === undefined ? undefined : Cpf.create(input.cpf);
    const phone =
      input.phone === undefined
        ? undefined
        : input.phone === null || input.phone.trim() === ''
          ? null
          : Phone.create(input.phone);

    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError();

    const emailChanged = email !== undefined && !user.email.equals(email);
    const cpfChanged = cpf !== undefined && !user.cpf.equals(cpf);

    if (emailChanged) {
      const existing = await this.users.findByEmail(email);
      if (existing && existing.id !== user.id)
        throw new EmailAlreadyInUseError();
    }
    if (cpfChanged && (await this.users.existsByCpf(cpf))) {
      throw new CpfAlreadyInUseError();
    }

    user.updatePersonalData({
      ...(input.name !== undefined && { name: input.name }),
      ...(email !== undefined && { email }),
      ...(cpf !== undefined && { cpf }),
      ...(phone !== undefined && { phone }),
    });
    await this.users.save(user);

    if (emailChanged) {
      try {
        await this.sendEmailVerification.execute({ userId: user.id });
      } catch (error) {
        this.logger.error(
          `Falha ao enviar a verificação do novo e-mail do usuário ${user.id}.`,
          error,
        );
      }
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email.value,
      cpf: user.cpf.value,
      profileData: user.profileData,
      phone: user.phone?.value ?? null,
      photoUrl: user.photoUrl?.value ?? null,
      emailVerified: user.emailVerified,
      status: user.status,
    };
  }
}
