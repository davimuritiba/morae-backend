import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ReviewAlreadySubmittedError extends DomainError {
  readonly code = 'REVIEW_ALREADY_IN_USE';

  constructor() {
    super('Este contrato já possui uma avaliação publicada.');
  }
}
