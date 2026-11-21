import type { PasswordResetToken } from '../../../domain/entities/password-reset-token.entity.js';
import { PasswordResetTokenRepository } from '../../../domain/repositories/password-reset-token.repository.js';

export class InMemoryPasswordResetTokenRepository extends PasswordResetTokenRepository {
  readonly items: PasswordResetToken[] = [];

  findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return Promise.resolve(
      this.items.find((token) => token.tokenHash === tokenHash) ?? null,
    );
  }

  deleteAllForUser(userId: string): Promise<void> {
    for (let index = this.items.length - 1; index >= 0; index--) {
      if (this.items[index].userId === userId) this.items.splice(index, 1);
    }
    return Promise.resolve();
  }

  save(token: PasswordResetToken): Promise<void> {
    const index = this.items.findIndex((item) => item.id === token.id);
    if (index >= 0) this.items[index] = token;
    else this.items.push(token);
    return Promise.resolve();
  }

  async consume(id: string, now: Date): Promise<boolean> {
    const token = this.items.find((item) => item.id === id);
    if (!token || !token.isActive(now)) return false;
    token.use(now);
    return true;
  }
}
