import type { Administrator } from '../../../domain/entities/administrator.entity.js';
import { AdministratorRepository } from '../../../domain/repositories/administrator.repository.js';

export class InMemoryAdministratorRepository extends AdministratorRepository {
  readonly items: Administrator[] = [];

  findById(id: string): Promise<Administrator | null> {
    return Promise.resolve(this.items.find((item) => item.id === id) ?? null);
  }

  findByUserId(userId: string): Promise<Administrator | null> {
    return Promise.resolve(
      this.items.find((item) => item.userId === userId) ?? null,
    );
  }

  findByLogin(login: string): Promise<Administrator | null> {
    const normalized = login.trim().toLowerCase();
    return Promise.resolve(
      this.items.find((item) => item.login === normalized) ?? null,
    );
  }

  save(administrator: Administrator): Promise<void> {
    const index = this.items.findIndex((item) => item.id === administrator.id);
    if (index >= 0) this.items[index] = administrator;
    else this.items.push(administrator);
    return Promise.resolve();
  }
}
