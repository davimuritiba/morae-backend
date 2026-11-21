import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ChatAccessDeniedError extends DomainError {
  readonly code = 'CHAT_ACCESS_DENIED';

  constructor() {
    super('Sua conta não pode usar o chat.');
  }
}
