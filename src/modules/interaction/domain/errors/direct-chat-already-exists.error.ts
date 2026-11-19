import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class DirectChatAlreadyExistsError extends DomainError {
  readonly code = 'DIRECT_CHAT_ALREADY_EXISTS';

  constructor() {
    super('Já existe uma conversa entre esses usuários.');
  }
}
