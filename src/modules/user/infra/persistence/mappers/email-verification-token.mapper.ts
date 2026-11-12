import type { EmailVerificationToken as PrismaEmailVerificationToken } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { EmailVerificationToken } from '../../../domain/entities/email-verification-token.entity.js';

// Converte entre a entidade EmailVerificationToken e a linha da tabela
// email_verification_tokens.
export class EmailVerificationTokenMapper {
  static toDomain(raw: PrismaEmailVerificationToken): EmailVerificationToken {
    return EmailVerificationToken.restore(raw.id, {
      userId: raw.userId,
      tokenHash: raw.tokenHash,
      expiresAt: raw.expiresAt,
      usedAt: raw.usedAt,
      createdAt: raw.createdAt,
    });
  }

  static toPersistence(
    token: EmailVerificationToken,
  ): PrismaEmailVerificationToken {
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
