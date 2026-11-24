import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InterestSelfActionDeniedError extends DomainError {
  readonly code = 'INTEREST_SELF_ACTION_DENIED';

  constructor() {
    super('Não é permitido manifestar interesse no próprio anúncio.');
  }
}
