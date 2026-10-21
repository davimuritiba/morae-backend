import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidBudgetRangeError extends DomainError {
  readonly code = 'INVALID_BUDGET_RANGE';

  constructor() {
    super(
      'Faixa de orçamento inválida: os valores não podem ser negativos e o mínimo não pode ser maior que o máximo.',
    );
  }
}
