import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class PasswordConfirmationMismatchError extends DomainError {
  readonly code = 'PASSWORD_CONFIRMATION_MISMATCH';

  constructor() {
    super('A confirmação da senha não corresponde à nova senha.');
  }
}
