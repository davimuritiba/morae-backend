import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class CompatibilityAnswersRequiredError extends DomainError {
  readonly code = 'COMPATIBILITY_ANSWERS_REQUIRED';
  constructor() {
    super('Responda o questionário de convivência para ver pessoas compatíveis com você.');
  }
}
