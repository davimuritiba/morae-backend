import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../../../shared/infra/database/prisma-transaction-context.js';
import { isUuid } from '../../../../../shared/infra/database/uuid.js';
import type { Administrator } from '../../../domain/entities/administrator.entity.js';
import { AdministratorRepository } from '../../../domain/repositories/administrator.repository.js';
import { AdministratorMapper } from '../mappers/administrator.mapper.js';

@Injectable()
export class PrismaAdministratorRepository extends AdministratorRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findById(id: string): Promise<Administrator | null> {
    if (!isUuid(id)) return null;
    const row = await this.db.client.administrator.findUnique({
      where: { id },
    });
    return row ? AdministratorMapper.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<Administrator | null> {
    if (!isUuid(userId)) return null;
    const row = await this.db.client.administrator.findUnique({
      where: { userId },
    });
    return row ? AdministratorMapper.toDomain(row) : null;
  }

  async findByLogin(login: string): Promise<Administrator | null> {
    const normalized = login.trim().toLowerCase();
    if (normalized.length === 0) return null;
    const row = await this.db.client.administrator.findUnique({
      where: { login: normalized },
    });
    return row ? AdministratorMapper.toDomain(row) : null;
  }

  async save(administrator: Administrator): Promise<void> {
    const data = AdministratorMapper.toPersistence(administrator);
    await this.db.client.administrator.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }
}
