import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../../../shared/infra/database/prisma-transaction-context.js';
import { isUuid } from '../../../../../shared/infra/database/uuid.js';
import type { PasswordResetToken } from '../../../domain/entities/password-reset-token.entity.js';
import { PasswordResetTokenRepository } from '../../../domain/repositories/password-reset-token.repository.js';
import { PasswordResetTokenMapper } from '../mappers/password-reset-token.mapper.js';

@Injectable()
export class PrismaPasswordResetTokenRepository extends PasswordResetTokenRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const row = await this.db.client.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    return row ? PasswordResetTokenMapper.toDomain(row) : null;
  }

  async deleteAllForUser(userId: string): Promise<void> {
    if (!isUuid(userId)) return;
    await this.db.client.passwordResetToken.deleteMany({ where: { userId } });
  }

  async save(token: PasswordResetToken): Promise<void> {
    const data = PasswordResetTokenMapper.toPersistence(token);
    await this.db.client.passwordResetToken.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async consume(id: string, now: Date): Promise<boolean> {
    if (!isUuid(id)) return false;
    const result = await this.db.client.passwordResetToken.updateMany({
      where: { id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    return result.count === 1;
  }
}
