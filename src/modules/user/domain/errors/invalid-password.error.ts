import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidPasswordError extends DomainError {
  readonly code = 'INVALID_PASSWORD';

  constructor(minLength: number, maxLength: number) {
    super(`A senha deve ter entre ${minLength} e ${maxLength} caracteres.`);
  }
}
