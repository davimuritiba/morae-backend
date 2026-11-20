import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InterestAccessDeniedError extends DomainError {
  readonly code = 'INTEREST_ACCESS_DENIED';

  constructor() {
    super('Somente o proprietário do anúncio pode consultar os interessados.');
  }
}
