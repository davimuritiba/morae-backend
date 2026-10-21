import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidPreferenceLevelError extends DomainError {
  readonly code = 'INVALID_PREFERENCE_LEVEL';

  constructor(min: number, max: number) {
    super(`A preferência deve ser um número inteiro entre ${min} e ${max}.`);
  }
}
