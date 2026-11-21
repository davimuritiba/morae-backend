import type { MessageCursor } from '../../../domain/repositories/message.repository.js';

export interface ListMessagesInput {
  actorId: string;
  chatId: string;
  before: MessageCursor | null;
  limit: number;
}
