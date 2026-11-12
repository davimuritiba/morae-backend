import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../../../shared/infra/database/prisma-transaction-context.js';
import { isUuid } from '../../../../../shared/infra/database/uuid.js';
import type { EmailVerificationToken } from '../../../domain/entities/email-verification-token.entity.js';
import { EmailVerificationTokenRepository } from '../../../domain/repositories/email-verification-token.repository.js';
import { EmailVerificationTokenMapper } from '../mappers/email-verification-token.mapper.js';

@Injectable()
export class PrismaEmailVerificationTokenRepository extends EmailVerificationTokenRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findByTokenHash(
    tokenHash: string,
  ): Promise<EmailVerificationToken | null> {
    const row = await this.db.client.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
    return row ? EmailVerificationTokenMapper.toDomain(row) : null;
  }

  async deleteAllForUser(userId: string): Promise<void> {
    if (!isUuid(userId)) return;

    await this.db.client.emailVerificationToken.deleteMany({
      where: { userId },
    });
  }

  // Cria ou atualiza pelo id. O token_hash é único no banco; como o hash vem
  // de 32 bytes aleatórios, uma colisão aqui indica erro de programação, e o
  // erro do Prisma é repassado como está.
  async save(token: EmailVerificationToken): Promise<void> {
    const data = EmailVerificationTokenMapper.toPersistence(token);

    await this.db.client.emailVerificationToken.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }
}
