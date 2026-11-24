import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

// O anúncio precisa ter de 1 a 10 fotos.
export class InvalidListingPhotoCountError extends DomainError {
  readonly code = 'INVALID_LISTING_PHOTO_COUNT';

  constructor(message = 'O anúncio precisa ter de 1 a 10 fotos.') {
    super(message);
  }
}
