import type { Clock } from '../../../../../shared/application/clock.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import { InvalidPasswordResetTokenError } from '../../../domain/errors/invalid-password-reset-token.error.js';
import { PasswordConfirmationMismatchError } from '../../../domain/errors/password-confirmation-mismatch.error.js';
import { Password } from '../../../domain/value-objects/password.vo.js';
import type { PasswordResetTokenRepository } from '../../../domain/repositories/password-reset-token.repository.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { Hasher } from '../../ports/hasher.port.js';
import type { VerificationTokenGenerator } from '../../ports/verification-token-generator.port.js';
import type { ResetPasswordInput } from './reset-password.input.js';

export class ResetPasswordUseCase implements UseCase<ResetPasswordInput, void> {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: PasswordResetTokenRepository,
    private readonly tokenGenerator: VerificationTokenGenerator,
    private readonly hasher: Hasher,
    private readonly clock: Clock,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ResetPasswordInput): Promise<void> {
    if (input.password !== input.passwordConfirmation) {
      throw new PasswordConfirmationMismatchError();
    }

    const resetToken = await this.tokens.findByTokenHash(
      this.tokenGenerator.hash(input.token),
    );
    const now = this.clock.now();
    if (!resetToken || !resetToken.isActive(now)) {
      throw new InvalidPasswordResetTokenError();
    }

    const user = await this.users.findById(resetToken.userId);
    if (!user) throw new InvalidPasswordResetTokenError();

    const password = Password.create(input.password);
    const passwordHash = await this.hasher.hash(password.value);
    user.changePasswordHash(passwordHash);

    await this.unitOfWork.run(async () => {
      const consumed = await this.tokens.consume(resetToken.id, now);
      if (!consumed) throw new InvalidPasswordResetTokenError();
      await this.users.save(user);
    });
  }
}
