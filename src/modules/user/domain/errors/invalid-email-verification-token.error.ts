import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

// Um único erro para token inexistente, expirado ou já usado: quem tenta
// adivinhar tokens não descobre qual dos casos aconteceu.
export class InvalidEmailVerificationTokenError extends DomainError {
  readonly code = 'INVALID_EMAIL_VERIFICATION_TOKEN';

  constructor() {
    super('Link de verificação inválido ou expirado. Solicite um novo.');
  }
}
