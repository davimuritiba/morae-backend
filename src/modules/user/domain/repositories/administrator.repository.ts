import type { Administrator } from '../entities/administrator.entity.js';

export abstract class AdministratorRepository {
  abstract findById(id: string): Promise<Administrator | null>;
  abstract findByUserId(userId: string): Promise<Administrator | null>;
  abstract save(administrator: Administrator): Promise<void>;
}
