import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class CpfAlreadyInUseError extends DomainError {
  readonly code = 'CPF_ALREADY_IN_USE';

  constructor() {
    super('Este CPF já está cadastrado.');
  }
}
