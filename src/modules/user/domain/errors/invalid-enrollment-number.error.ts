import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidEnrollmentNumberError extends DomainError {
  readonly code = 'INVALID_ENROLLMENT_NUMBER';

  constructor() {
    super('Número de matrícula inválido.');
  }
}
