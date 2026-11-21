import type { Clock } from '../../../../../shared/application/clock.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import { PasswordResetToken } from '../../../domain/entities/password-reset-token.entity.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import type { PasswordResetTokenRepository } from '../../../domain/repositories/password-reset-token.repository.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { PasswordResetNotifier } from '../../ports/password-reset-notifier.port.js';
import type { VerificationTokenGenerator } from '../../ports/verification-token-generator.port.js';
import type { RequestPasswordResetInput } from './request-password-reset.input.js';

export interface RequestPasswordResetOptions {
  tokenTtlMs: number;
}

export class RequestPasswordResetUseCase implements UseCase<
  RequestPasswordResetInput,
  void
> {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: PasswordResetTokenRepository,
    private readonly tokenGenerator: VerificationTokenGenerator,
    private readonly notifier: PasswordResetNotifier,
    private readonly clock: Clock,
    private readonly unitOfWork: UnitOfWork,
    private readonly options: RequestPasswordResetOptions,
  ) {
    if (!Number.isInteger(options.tokenTtlMs) || options.tokenTtlMs <= 0) {
      throw new Error('tokenTtlMs precisa ser um inteiro positivo.');
    }
  }

  async execute(input: RequestPasswordResetInput): Promise<void> {
    const user = await this.users.findByEmail(Email.create(input.email));
    if (!user || user.status !== AccountStatus.ACTIVE) return;

    const now = this.clock.now();
    const { token, tokenHash } = this.tokenGenerator.generate();
    const resetToken = PasswordResetToken.create({
      userId: user.id,
      tokenHash,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + this.options.tokenTtlMs),
    });

    await this.unitOfWork.run(async () => {
      await this.tokens.deleteAllForUser(user.id);
      await this.tokens.save(resetToken);
    });

    await this.notifier.sendPasswordResetEmail({
      to: user.email.value,
      name: user.name,
      token,
      expiresAt: resetToken.expiresAt,
    });
  }
}
