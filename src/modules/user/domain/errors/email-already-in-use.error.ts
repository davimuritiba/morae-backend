import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class EmailAlreadyInUseError extends DomainError {
  readonly code = 'EMAIL_ALREADY_IN_USE';

  constructor() {
    super('Este e-mail já está cadastrado.');
  }
}
