import { Injectable } from '@nestjs/common';
import {
  ChatNotifier,
  type MessagesReadEvent,
} from '../../application/ports/chat-notifier.port.js';
import type { MessageView } from '../../application/views/message.view.js';
import { ChatPresenter } from '../http/presenters/chat.presenter.js';
import { ChatGateway, userRoom } from './chat.gateway.js';

export const CHAT_EVENTS = {
  newMessage: 'message:new',
  messagesRead: 'chat:read',
} as const;

@Injectable()
export class SocketChatNotifier extends ChatNotifier {
  constructor(private readonly gateway: ChatGateway) {
    super();
  }

  notifyNewMessage(
    message: MessageView,
    recipientIds: string[],
  ): Promise<void> {
    this.emit(
      recipientIds,
      CHAT_EVENTS.newMessage,
      ChatPresenter.message(message),
    );
    return Promise.resolve();
  }

  notifyMessagesRead(
    event: MessagesReadEvent,
    recipientIds: string[],
  ): Promise<void> {
    this.emit(recipientIds, CHAT_EVENTS.messagesRead, {
      chatId: event.chatId,
      userId: event.userId,
      readAt: event.readAt.toISOString(),
    });
    return Promise.resolve();
  }

  private emit(recipientIds: string[], event: string, payload: unknown): void {
    if (recipientIds.length === 0 || !this.gateway.server) return;
    this.gateway.server.to(recipientIds.map(userRoom)).emit(event, payload);
  }
}
