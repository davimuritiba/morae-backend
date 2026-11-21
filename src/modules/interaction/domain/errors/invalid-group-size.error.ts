import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class InvalidGroupSizeError extends DomainError {
  readonly code = 'INVALID_GROUP_SIZE';

  constructor(min: number, max: number) {
    super(`O grupo deve ter entre ${min} e ${max} participantes.`);
  }
}
