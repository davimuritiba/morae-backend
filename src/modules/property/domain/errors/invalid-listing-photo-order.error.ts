import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidListingPhotoOrderError extends DomainError {
  readonly code = 'INVALID_LISTING_PHOTO_ORDER';

  constructor() {
    super('A nova ordem precisa conter cada foto do anúncio exatamente uma vez.');
  }
}
