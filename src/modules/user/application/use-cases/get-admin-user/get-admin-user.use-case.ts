import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { AdminUserRecord } from '../../../domain/repositories/user.repository.js';

export class GetAdminUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<AdminUserRecord> {
    const user = await this.users.findAdminById(userId);
    if (!user) throw new UserNotFoundError();
    return user;
  }
}
