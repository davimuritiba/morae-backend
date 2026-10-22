import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidIncomeError extends DomainError {
  readonly code = 'INVALID_INCOME';

  constructor() {
    super('A renda deve ser um número maior ou igual a zero.');
  }
}
