import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InterestNotFoundError extends DomainError {
  readonly code = 'INTEREST_NOT_FOUND';

  constructor() {
    super('Manifestação de interesse não encontrada.');
  }
}
