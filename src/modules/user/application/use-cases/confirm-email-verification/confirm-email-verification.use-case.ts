import type { Clock } from '../../../../../shared/application/clock.js';
import type { UnitOfWork } from '../../../../../shared/application/unit-of-work.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import { InvalidEmailVerificationTokenError } from '../../../domain/errors/invalid-email-verification-token.error.js';
import type { EmailVerificationTokenRepository } from '../../../domain/repositories/email-verification-token.repository.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { VerificationTokenGenerator } from '../../ports/verification-token-generator.port.js';
import type { ConfirmEmailVerificationInput } from './confirm-email-verification.input.js';

// Confirma o e-mail a partir do token do link. Token inexistente, expirado,
// já usado ou de um usuário que não existe mais resultam no mesmo erro.
export class ConfirmEmailVerificationUseCase implements UseCase<
  ConfirmEmailVerificationInput,
  void
> {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: EmailVerificationTokenRepository,
    private readonly tokenGenerator: VerificationTokenGenerator,
    private readonly clock: Clock,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: ConfirmEmailVerificationInput): Promise<void> {
    if (input.token.length === 0) {
      throw new InvalidEmailVerificationTokenError();
    }

    const verification = await this.tokens.findByTokenHash(
      this.tokenGenerator.hash(input.token),
    );
    if (!verification) {
      throw new InvalidEmailVerificationTokenError();
    }

    const user = await this.users.findById(verification.userId);
    if (!user) {
      throw new InvalidEmailVerificationTokenError();
    }

    // Lança InvalidEmailVerificationTokenError se expirado ou já usado.
    verification.use(this.clock.now());
    user.verifyEmail();

    // Token consumido e e-mail verificado juntos, ou nenhum dos dois.
    await this.unitOfWork.run(async () => {
      await this.tokens.save(verification);
      await this.users.save(user);
    });
  }
}
