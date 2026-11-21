import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ListingNotFoundError extends DomainError {
  readonly code = 'LISTING_NOT_FOUND';

  constructor() {
    super('Anúncio não encontrado.');
  }
}
