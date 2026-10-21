import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidCpfError extends DomainError {
  readonly code = 'INVALID_CPF';

  constructor() {
    super('CPF inválido.');
  }
}
