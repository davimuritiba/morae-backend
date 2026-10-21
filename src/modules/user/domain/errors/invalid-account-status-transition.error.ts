import { DomainError } from '../../../../shared/domain/errors/domain-error.js';
import type { AccountStatus } from '../enums/account-status.enum.js';

export class InvalidAccountStatusTransitionError extends DomainError {
  readonly code = 'INVALID_ACCOUNT_STATUS_TRANSITION';

  constructor(from: AccountStatus, to: AccountStatus) {
    super(`Não é possível alterar a conta de ${from} para ${to}.`);
  }
}
