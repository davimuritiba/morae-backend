import type { Chat } from '../../../domain/entities/chat.entity.js';
import { DirectChatAlreadyExistsError } from '../../../domain/errors/direct-chat-already-exists.error.js';
import { ChatRepository } from '../../../domain/repositories/chat.repository.js';

export class InMemoryChatRepository extends ChatRepository {
  readonly items: Chat[] = [];

  findById(id: string): Promise<Chat | null> {
    return Promise.resolve(this.items.find((c) => c.id === id) ?? null);
  }

  findByDirectKey(directKey: string): Promise<Chat | null> {
    return Promise.resolve(
      this.items.find((c) => c.directKey === directKey) ?? null,
    );
  }

  save(chat: Chat): Promise<void> {
    const others = this.items.filter((c) => c.id !== chat.id);
    if (
      chat.directKey !== null &&
      others.some((c) => c.directKey === chat.directKey)
    ) {
      return Promise.reject(new DirectChatAlreadyExistsError());
    }

    const index = this.items.findIndex((c) => c.id === chat.id);
    if (index >= 0) {
      this.items[index] = chat;
    } else {
      this.items.push(chat);
    }
    return Promise.resolve();
  }
}
