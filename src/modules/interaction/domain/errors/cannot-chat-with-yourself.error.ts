import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class CannotChatWithYourselfError extends DomainError {
  readonly code = 'CANNOT_CHAT_WITH_YOURSELF';

  constructor() {
    super('Não é possível iniciar uma conversa consigo mesmo.');
  }
}
