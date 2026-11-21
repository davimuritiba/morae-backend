import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class EmptyMessageError extends DomainError {
  readonly code = 'EMPTY_MESSAGE';

  constructor() {
    super('A mensagem precisa ter um texto ou um anúncio.');
  }
}
