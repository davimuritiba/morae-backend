import type { Message } from '../../domain/entities/message.entity.js';

export interface MessageView {
  id: string;
  chatId: string;
  senderId: string;
  content: string | null;
  listingId: string | null;
  createdAt: Date;
}

export function toMessageView(message: Message): MessageView {
  return {
    id: message.id,
    chatId: message.chatId,
    senderId: message.senderId,
    content: message.content?.value ?? null,
    listingId: message.listingId,
    createdAt: message.createdAt,
  };
}
