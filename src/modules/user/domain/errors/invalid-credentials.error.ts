import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

// Mensagem genérica de propósito: não revela se o login ou a conta existem.
export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';

  constructor() {
    super('Credenciais inválidas.');
  }
}
