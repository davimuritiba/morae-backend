import type { Message } from '../entities/message.entity.js';

export interface MessageCursor {
  createdAt: Date;
  id: string;
}

export interface ListMessagesParams {
  chatId: string;
  visibleSince: Date;
  before: MessageCursor | null;
  limit: number;
}

export abstract class MessageRepository {
  // Mais recentes primeiro, ordenadas por (createdAt, id).
  abstract listByChat(params: ListMessagesParams): Promise<Message[]>;
  abstract save(message: Message): Promise<void>;
}
