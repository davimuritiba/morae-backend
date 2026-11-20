import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidListingTransitionError extends DomainError {
  readonly code = 'INVALID_LISTING_TRANSITION';

  constructor() {
    super('Não é possível alterar o anúncio a partir do estado atual.');
  }
}