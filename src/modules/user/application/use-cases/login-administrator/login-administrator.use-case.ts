import { Hasher } from '../../ports/hasher.port.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { InvalidCredentialsError } from '../../../domain/errors/invalid-credentials.error.js';
import { AdministratorRepository } from '../../../domain/repositories/administrator.repository.js';
import { UserRepository } from '../../../domain/repositories/user.repository.js';
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
    const administrator = await this.administrators.findByLogin(input.login);

    if (
      administrator === null ||
      !(await this.hasher.compare(
        input.password,
        administrator.passwordHash,
      ))
    ) {
      throw new InvalidCredentialsError();
    }

    const user = await this.users.findById(administrator.userId);
    if (user === null || user.status !== AccountStatus.ACTIVE) {
      throw new InvalidCredentialsError();
    }

    return {
      administratorId: administrator.id,
      userId: administrator.userId,
      login: administrator.login,
      permissions: administrator.permissions,
    };
  }
}
