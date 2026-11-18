import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class EmailNotVerifiedError extends DomainError {
  readonly code = 'EMAIL_NOT_VERIFIED';

  constructor() {
    super('Confirme seu e-mail para usar o chat.');
  }
}
