import { Hasher } from '../../ports/hasher.port.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { EmailNotVerifiedError } from '../../../domain/errors/email-not-verified.error.js';
import { InvalidCredentialsError } from '../../../domain/errors/invalid-credentials.error.js';
import { UserRepository } from '../../../domain/repositories/user.repository.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import type { LoginInput } from './login.input.js';
import type { LoginOutput } from './login.output.js';

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: Hasher,
  ) {}

  async execute(input: LoginInput): Promise<LoginOutput> {
    const email = Email.create(input.email);
    const user = await this.users.findByEmail(email);

    if (
      user === null ||
      user.status !== AccountStatus.ACTIVE ||
      !(await this.hasher.compare(input.password, user.passwordHash))
    ) {
      throw new InvalidCredentialsError();
    }

    // Conta criada pelo cadastro só entra depois de confirmar o e-mail pelo
    // link enviado (POST /email-verification/confirm).
    if (!user.emailVerified) {
      throw new EmailNotVerifiedError();
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email.value,
      status: user.status,
      accountType: await this.users.findAccountType(user.id),
    };
  }
}
