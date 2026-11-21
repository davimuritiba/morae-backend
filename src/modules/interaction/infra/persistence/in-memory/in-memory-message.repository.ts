import type { Message } from '../../../domain/entities/message.entity.js';
import {
  MessageRepository,
  type ListMessagesParams,
  type MessageCursor,
} from '../../../domain/repositories/message.repository.js';

export class InMemoryMessageRepository extends MessageRepository {
  readonly items: Message[] = [];

  listByChat(params: ListMessagesParams): Promise<Message[]> {
    const since = params.visibleSince.getTime();
    const result = this.items
      .filter(
        (m) =>
          m.chatId === params.chatId &&
          m.createdAt.getTime() >= since &&
          (params.before === null || isBefore(m, params.before)),
      )
      .sort((a, b) => compareDesc(a, b))
      .slice(0, params.limit);

    return Promise.resolve(result);
  }

  save(message: Message): Promise<void> {
    const index = this.items.findIndex((m) => m.id === message.id);
    if (index >= 0) {
      this.items[index] = message;
    } else {
      this.items.push(message);
    }
    return Promise.resolve();
  }
}

function isBefore(message: Message, cursor: MessageCursor): boolean {
  const time = message.createdAt.getTime();
  const cursorTime = cursor.createdAt.getTime();
  return time < cursorTime || (time === cursorTime && message.id < cursor.id);
}

function compareDesc(a: Message, b: Message): number {
  const diff = b.createdAt.getTime() - a.createdAt.getTime();
  if (diff !== 0) return diff;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}
