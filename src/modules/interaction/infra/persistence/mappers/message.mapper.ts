import type { Message as PrismaMessage } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { Message } from '../../../domain/entities/message.entity.js';
import { MessageContent } from '../../../domain/value-objects/message-content.vo.js';

export class MessageMapper {
  static toDomain(raw: PrismaMessage): Message {
    return Message.restore(raw.id, {
      chatId: raw.chatId,
      senderId: raw.senderId,
      content: raw.content === null ? null : MessageContent.create(raw.content),
      listingId: raw.listingId,
      createdAt: raw.createdAt,
    });
  }

  static toPersistence(message: Message): PrismaMessage {
    return {
      id: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      content: message.content?.value ?? null,
      listingId: message.listingId,
      createdAt: message.createdAt,
    };
  }
}
