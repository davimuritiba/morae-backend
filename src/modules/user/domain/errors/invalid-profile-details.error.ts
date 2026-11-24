import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidProfileDetailsError extends DomainError {
  readonly code = 'INVALID_PROFILE_DETAILS';

  constructor(message: string) {
    super(message);
  }
}
