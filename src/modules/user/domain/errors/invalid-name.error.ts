import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidNameError extends DomainError {
  readonly code = 'INVALID_NAME';

  constructor(maxLength: number) {
    super(`O nome é obrigatório e deve ter no máximo ${maxLength} caracteres.`);
  }
}
