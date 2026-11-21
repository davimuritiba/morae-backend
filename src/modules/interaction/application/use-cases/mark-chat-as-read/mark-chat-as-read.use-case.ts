import type { Clock } from '../../../../../shared/application/clock.js';
import type { Logger } from '../../../../../shared/application/logger.js';
import type { UseCase } from '../../../../../shared/application/use-case.js';
import type { ChatRepository } from '../../../domain/repositories/chat.repository.js';
import {
  ensureCanChat,
  findChatOfParticipant,
} from '../../policies/chat-access.policy.js';
import type { ChatNotifier } from '../../ports/chat-notifier.port.js';
import type { ChatUserDirectory } from '../../ports/chat-user-directory.port.js';
import type { MarkChatAsReadInput } from './mark-chat-as-read.input.js';

export class MarkChatAsReadUseCase implements UseCase<
  MarkChatAsReadInput,
  void
> {
  constructor(
    private readonly chats: ChatRepository,
    private readonly users: ChatUserDirectory,
    private readonly notifier: ChatNotifier,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  async execute(input: MarkChatAsReadInput): Promise<void> {
    await ensureCanChat(this.users, input.actorId);
    const chat = await findChatOfParticipant(
      this.chats,
      input.chatId,
      input.actorId,
    );

    const readAt = this.clock.now();
    chat.markAsRead(input.actorId, readAt);
    await this.chats.save(chat);

    const recipientIds = chat.participants
      .map((p) => p.userId)
      .filter((id) => id !== input.actorId);

    try {
      await this.notifier.notifyMessagesRead(
        { chatId: chat.id, userId: input.actorId, readAt },
        recipientIds,
      );
    } catch (error) {
      this.logger.error(
        `Falha ao notificar a leitura da conversa ${chat.id}.`,
        error,
      );
    }
  }
}
