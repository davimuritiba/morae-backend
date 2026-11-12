import type { Clock } from '../../../../../shared/application/clock.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import { EmailVerificationToken } from '../../../domain/entities/email-verification-token.entity.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import type { EmailVerificationTokenRepository } from '../../../domain/repositories/email-verification-token.repository.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { EmailVerificationNotifier } from '../../ports/email-verification-notifier.port.js';
import type { VerificationTokenGenerator } from '../../ports/verification-token-generator.port.js';
import type { SendEmailVerificationInput } from './send-email-verification.input.js';

export interface SendEmailVerificationOptions {
  // Validade do link, em milissegundos.
  tokenTtlMs: number;
}

// Gera um token novo, descarta os anteriores do usuário e envia o link.
// Usado logo após o cadastro e pelo reenvio.
export class SendEmailVerificationUseCase implements UseCase<
  SendEmailVerificationInput,
  void
> {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: EmailVerificationTokenRepository,
    private readonly tokenGenerator: VerificationTokenGenerator,
    private readonly notifier: EmailVerificationNotifier,
    private readonly clock: Clock,
    private readonly unitOfWork: UnitOfWork,
    private readonly options: SendEmailVerificationOptions,
  ) {
    if (!Number.isInteger(options.tokenTtlMs) || options.tokenTtlMs <= 0) {
      throw new Error('tokenTtlMs precisa ser um inteiro positivo.');
    }
  }

  async execute(input: SendEmailVerificationInput): Promise<void> {
    const user = await this.users.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Nada a verificar, ou conta suspensa/desativada: não envia e-mail.
    if (user.emailVerified || user.status !== AccountStatus.ACTIVE) {
      return;
    }

    const now = this.clock.now();
    const { token, tokenHash } = this.tokenGenerator.generate();
    const verification = EmailVerificationToken.create({
      userId: user.id,
      tokenHash,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + this.options.tokenTtlMs),
    });

    // Só o link mais recente funciona.
    await this.unitOfWork.run(async () => {
      await this.tokens.deleteAllForUser(user.id);
      await this.tokens.save(verification);
    });

    // Depois do commit: o e-mail só sai com o token já salvo. Se o envio
    // falhar, o token fica sem uso e o usuário pode pedir o reenvio.
    await this.notifier.sendVerificationEmail({
      to: user.email.value,
      name: user.name,
      token,
      expiresAt: verification.expiresAt,
    });
  }
}
