import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidExpectedGraduationError extends DomainError {
  readonly code = 'INVALID_EXPECTED_GRADUATION';

  constructor() {
    super('Data de formatura prevista inválida.');
  }
}
