import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ReviewNotEligibleError extends DomainError {
  readonly code = 'REVIEW_NOT_ELIGIBLE';

  constructor() {
    super('Somente o inquilino de uma moradia já iniciada pode avaliá-la.');
  }
}
