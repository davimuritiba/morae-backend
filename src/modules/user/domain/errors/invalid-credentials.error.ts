import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

// Mensagem genérica de propósito: não revela se o e-mail existe.
export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('E-mail ou senha incorretos.');
  }
}
