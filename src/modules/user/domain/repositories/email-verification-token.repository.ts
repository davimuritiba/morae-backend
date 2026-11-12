import type { EmailVerificationToken } from '../entities/email-verification-token.entity.js';

export abstract class EmailVerificationTokenRepository {
  // A busca é pelo hash: o caso de uso recebe o token do link, calcula o hash
  // e procura por ele. O hash deve ser único no banco.
  abstract findByTokenHash(
    tokenHash: string,
  ): Promise<EmailVerificationToken | null>;
  // Ao reenviar o e-mail, os tokens anteriores do usuário são descartados,
  // para que só o link mais recente funcione.
  abstract deleteAllForUser(userId: string): Promise<void>;
  // Cria ou atualiza pelo id (ex.: para gravar usedAt depois do uso).
  abstract save(token: EmailVerificationToken): Promise<void>;
}
