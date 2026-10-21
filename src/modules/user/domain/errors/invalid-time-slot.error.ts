import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidTimeSlotError extends DomainError {
  readonly code = 'INVALID_TIME_SLOT';

  constructor() {
    super('Horário inválido: use o formato HH:mm e um início anterior ao fim.');
  }
}
