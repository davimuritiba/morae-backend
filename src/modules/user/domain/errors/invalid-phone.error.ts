import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidPhoneError extends DomainError {
  readonly code = 'INVALID_PHONE';

  constructor() {
    super('Telefone inválido: informe DDD e número.');
  }
}
