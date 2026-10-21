import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidAcademicPeriodError extends DomainError {
  readonly code = 'INVALID_ACADEMIC_PERIOD';

  constructor(min: number, max: number) {
    super(`O período deve ser um número inteiro entre ${min} e ${max}.`);
  }
}
