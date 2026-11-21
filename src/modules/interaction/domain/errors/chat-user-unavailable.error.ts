import { DomainError } from '../../../../shared/domain/errors/domain-error.js';

export class ChatUserUnavailableError extends DomainError {
  readonly code = 'CHAT_USER_UNAVAILABLE';

  constructor() {
    super('Este usuário não está disponível para conversar.');
  }
}
