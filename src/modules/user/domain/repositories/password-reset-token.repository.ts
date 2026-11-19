import type { PasswordResetToken } from '../entities/password-reset-token.entity.js';

export abstract class PasswordResetTokenRepository {
  abstract findByTokenHash(
    tokenHash: string,
  ): Promise<PasswordResetToken | null>;
  abstract deleteAllForUser(userId: string): Promise<void>;
  abstract save(token: PasswordResetToken): Promise<void>;
  // Atomically consumes a token only if it is still unused and unexpired.
  abstract consume(id: string, now: Date): Promise<boolean>;
}
