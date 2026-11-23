import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ReviewTargetNotFoundError extends DomainError {
  readonly code = 'REVIEW_TARGET_NOT_FOUND';

  constructor() {
    super('O perfil avaliado não foi encontrado.');
  }
}
