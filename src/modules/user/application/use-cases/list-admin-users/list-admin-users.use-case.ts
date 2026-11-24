import { UserRepository } from '../../../domain/repositories/user.repository.js';
import type { AdminUserPage } from '../../../domain/repositories/user.repository.js';
import type { AccountStatus } from '../../../domain/enums/account-status.enum.js';

export interface ListAdminUsersInput {
  search?: string;
  status?: AccountStatus;
  page: number;
  limit: number;
}

export class ListAdminUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  execute(input: ListAdminUsersInput): Promise<AdminUserPage> {
    return this.users.findAdminPage({
      ...input,
      search: input.search?.trim() || undefined,
    });
  }
}
