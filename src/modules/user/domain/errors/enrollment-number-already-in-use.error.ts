import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class EnrollmentNumberAlreadyInUseError extends DomainError {
  readonly code = 'ENROLLMENT_NUMBER_ALREADY_IN_USE';

  constructor() {
    super('Esta matrícula já está cadastrada.');
  }
}
