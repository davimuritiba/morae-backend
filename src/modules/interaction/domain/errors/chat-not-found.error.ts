import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ChatNotFoundError extends DomainError {
  readonly code = 'CHAT_NOT_FOUND';

  constructor() {
    super('Conversa não encontrada.');
  }
}
