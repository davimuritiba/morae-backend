import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export const ACCOUNT_TYPE_ACCESS_DENIED = 'ACCOUNT_TYPE_ACCESS_DENIED';

export class AccountTypeAccessDeniedError extends DomainError {
  readonly code = ACCOUNT_TYPE_ACCESS_DENIED;

  constructor() {
    super('Seu tipo de conta não pode acessar este recurso.');
  }
}
