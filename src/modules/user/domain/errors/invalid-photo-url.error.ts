import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidPhotoUrlError extends DomainError {
  readonly code = 'INVALID_PHOTO_URL';

  constructor() {
    super('URL da foto inválida: use um endereço https.');
  }
}
