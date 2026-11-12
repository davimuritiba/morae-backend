import type { UseCase } from '../../../../../shared/application/use-case.js';
import type { UserRepository } from '../../../domain/repositories/user.repository.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import type { SendEmailVerificationUseCase } from '../send-email-verification/send-email-verification.use-case.js';
import type { ResendEmailVerificationInput } from './resend-email-verification.input.js';

// Reenvia o link de verificação. Termina igual (sem erro e sem retorno)
// exista ou não uma conta com o e-mail, para não revelar quais e-mails estão
// cadastrados. Contas já verificadas ou inativas são ignoradas pelo
// SendEmailVerificationUseCase.
export class ResendEmailVerificationUseCase implements UseCase<
  ResendEmailVerificationInput,
  void
> {
  constructor(
    private readonly users: UserRepository,
    private readonly sendEmailVerification: SendEmailVerificationUseCase,
  ) {}

  async execute(input: ResendEmailVerificationInput): Promise<void> {
    // Formato inválido é erro de entrada (422) e não revela nada sobre contas.
    const email = Email.create(input.email);

    const user = await this.users.findByEmail(email);
    if (!user) {
      return;
    }

    await this.sendEmailVerification.execute({ userId: user.id });
  }
}
