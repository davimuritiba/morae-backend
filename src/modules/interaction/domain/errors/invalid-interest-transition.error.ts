import { DomainError } from '../../../../shared/domain/errors/domain-error.js';
import type { InterestStatus } from '../enums/interest-status.enum.js';

export class InvalidInterestTransitionError extends DomainError {
  readonly code = 'INVALID_INTEREST_TRANSITION';

  constructor(from: InterestStatus, to: InterestStatus) {
    super(`Não é possível alterar o interesse de ${from} para ${to}.`);
  }
}
