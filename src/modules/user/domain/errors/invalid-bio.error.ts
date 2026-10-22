import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidBioError extends DomainError {
  readonly code = 'INVALID_BIO';

  constructor(maxLength: number) {
    super(`A bio deve ter no máximo ${maxLength} caracteres.`);
  }
}
