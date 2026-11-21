import type { MessageView } from '../views/message.view.js';

export interface MessagesReadEvent {
  chatId: string;
  userId: string;
  readAt: Date;
}

export abstract class ChatNotifier {
  abstract notifyNewMessage(
    message: MessageView,
    recipientIds: string[],
  ): Promise<void>;
  abstract notifyMessagesRead(
    event: MessagesReadEvent,
    recipientIds: string[],
  ): Promise<void>;
}
