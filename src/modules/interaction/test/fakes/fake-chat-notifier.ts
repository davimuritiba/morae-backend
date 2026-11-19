import {
  ChatNotifier,
  type MessagesReadEvent,
} from '../../application/ports/chat-notifier.port.js';
import type { MessageView } from '../../application/views/message.view.js';

export class FakeChatNotifier extends ChatNotifier {
  readonly notified: { message: MessageView; recipientIds: string[] }[] = [];
  readonly reads: { event: MessagesReadEvent; recipientIds: string[] }[] = [];
  failWith: Error | null = null;

  notifyNewMessage(
    message: MessageView,
    recipientIds: string[],
  ): Promise<void> {
    const failure = this.takeFailure();
    if (failure) return Promise.reject(failure);
    this.notified.push({ message, recipientIds });
    return Promise.resolve();
  }

  notifyMessagesRead(
    event: MessagesReadEvent,
    recipientIds: string[],
  ): Promise<void> {
    const failure = this.takeFailure();
    if (failure) return Promise.reject(failure);
    this.reads.push({ event, recipientIds });
    return Promise.resolve();
  }

  private takeFailure(): Error | null {
    const failure = this.failWith;
    this.failWith = null;
    return failure;
  }
}
