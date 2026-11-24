import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ListingPhotoNotFoundError extends DomainError {
  readonly code = 'LISTING_PHOTO_NOT_FOUND';

  constructor() {
    super('Foto do anúncio não encontrada.');
  }
}
