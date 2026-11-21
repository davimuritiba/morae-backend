import type { PasswordResetToken as PrismaPasswordResetToken } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PasswordResetToken } from '../../../domain/entities/password-reset-token.entity.js';

export class PasswordResetTokenMapper {
  static toDomain(raw: PrismaPasswordResetToken): PasswordResetToken {
    return PasswordResetToken.restore(raw.id, {
      userId: raw.userId,
      tokenHash: raw.tokenHash,
      expiresAt: raw.expiresAt,
      usedAt: raw.usedAt,
      createdAt: raw.createdAt,
    });
  }

  static toPersistence(token: PasswordResetToken): PrismaPasswordResetToken {
    return {
      id: token.id,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt,
      createdAt: token.createdAt,
    };
  }
}
