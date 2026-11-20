import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class EmptyUserProfileUpdateError extends DomainError {
  readonly code = 'EMPTY_USER_PROFILE_UPDATE';

  constructor() {
    super('Informe ao menos um dado para atualizar.');
  }
}
