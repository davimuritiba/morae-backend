import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { AdminUserRecord } from '../../../domain/repositories/user.repository.js';

export class ChangeUserAccountStatusUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(
    userId: string,
    status: AccountStatus,
  ): Promise<AdminUserRecord> {
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError();

    if (user.status !== status) {
      switch (status) {
        case AccountStatus.ACTIVE:
          user.reactivate();
          break;
        case AccountStatus.SUSPENDED:
          user.suspend();
          break;
        case AccountStatus.DEACTIVATED:
          user.deactivate();
          break;
      }
      await this.users.save(user);
    }

    const updatedUser = await this.users.findAdminById(userId);
    if (!updatedUser) throw new UserNotFoundError();
    return updatedUser;
  }
}
