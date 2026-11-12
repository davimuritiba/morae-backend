import type { EmailVerificationToken } from '../../../domain/entities/email-verification-token.entity.js';
import { EmailVerificationTokenRepository } from '../../../domain/repositories/email-verification-token.repository.js';

export class InMemoryEmailVerificationTokenRepository extends EmailVerificationTokenRepository {
  // Público para os testes inspecionarem o que foi salvo.
  readonly items: EmailVerificationToken[] = [];

  findByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null> {
    return Promise.resolve(
      this.items.find((t) => t.tokenHash === tokenHash) ?? null,
    );
  }

  deleteAllForUser(userId: string): Promise<void> {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i].userId === userId) {
        this.items.splice(i, 1);
      }
    }
    return Promise.resolve();
  }

  // Simula a constraint UNIQUE de token_hash do banco.
  save(token: EmailVerificationToken): Promise<void> {
    const others = this.items.filter((t) => t.id !== token.id);
    if (others.some((t) => t.tokenHash === token.tokenHash)) {
      return Promise.reject(new Error('token_hash duplicado.'));
    }

    const index = this.items.findIndex((t) => t.id === token.id);
    if (index >= 0) {
      this.items[index] = token;
    } else {
      this.items.push(token);
    }
    return Promise.resolve();
  }
}
