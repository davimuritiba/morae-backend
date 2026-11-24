import { Hasher } from '../../ports/hasher.port.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import type { Administrator } from '../../../domain/entities/administrator.entity.js';
import { InvalidCredentialsError } from '../../../domain/errors/invalid-credentials.error.js';
import { AdministratorRepository } from '../../../domain/repositories/administrator.repository.js';
import { UserRepository } from '../../../domain/repositories/user.repository.js';
import { Email } from '../../../domain/value-objects/email.vo.js';
import type { LoginAdministratorInput } from './login-administrator.input.js';
import type { LoginAdministratorOutput } from './login-administrator.output.js';

export class LoginAdministratorUseCase {
  constructor(
    private readonly administrators: AdministratorRepository,
    private readonly users: UserRepository,
    private readonly hasher: Hasher,
  ) {}

  async execute(
    input: LoginAdministratorInput,
  ): Promise<LoginAdministratorOutput> {
    const administrator = await this.findAdministrator(input.login);

    if (
      administrator === null ||
      !(await this.hasher.compare(
        input.password,
        administrator.passwordHash,
      ))
    ) {
      throw new InvalidCredentialsError();
    }

    const accountStatus = await this.users.findAccountStatusById(
      administrator.userId,
    );
    if (accountStatus !== AccountStatus.ACTIVE) {
      throw new InvalidCredentialsError();
    }

    return {
      administratorId: administrator.id,
      userId: administrator.userId,
      login: administrator.login,
      permissions: administrator.permissions,
    };
  }

  // Aceita o login do administrador ou o e-mail da conta ligada a ele: quem
  // vê "admin@morae.com" na lista de usuários tende a digitar o e-mail.
  private async findAdministrator(
    identifier: string,
  ): Promise<Administrator | null> {
    const byLogin = await this.administrators.findByLogin(identifier);
    if (byLogin !== null || !identifier.includes('@')) return byLogin;

    let email: Email;
    try {
      email = Email.create(identifier);
    } catch {
      return null;
    }
    const userId = await this.users.findIdByEmail(email);
    return userId === null
      ? null
      : this.administrators.findByUserId(userId);
  }
}
