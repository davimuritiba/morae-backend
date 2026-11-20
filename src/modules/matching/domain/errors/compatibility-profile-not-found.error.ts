import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class CompatibilityProfileNotFoundError extends DomainError {
  readonly code = 'COMPATIBILITY_PROFILE_NOT_FOUND';
  constructor() {
    super('Um dos usuários ainda não possui respostas de convivência cadastradas.');
  }
}
