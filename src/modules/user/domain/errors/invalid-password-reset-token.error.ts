import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidPasswordResetTokenError extends DomainError {
  readonly code = 'INVALID_PASSWORD_RESET_TOKEN';

  constructor() {
    super('Link de recuperação inválido ou expirado. Solicite um novo.');
  }
}
