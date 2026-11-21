import type { UseCase } from '../../../../../shared/application/use-case.js';
import type { ChatRepository } from '../../../domain/repositories/chat.repository.js';
import type { MessageRepository } from '../../../domain/repositories/message.repository.js';
import {
  ensureCanChat,
  findChatOfParticipant,
} from '../../policies/chat-access.policy.js';
import type { ChatUserDirectory } from '../../ports/chat-user-directory.port.js';
import { toMessageView } from '../../views/message.view.js';
import type { ListMessagesInput } from './list-messages.input.js';
import type { ListMessagesOutput } from './list-messages.output.js';

export const LIST_MESSAGES_MAX_LIMIT = 100;

export class ListMessagesUseCase implements UseCase<
  ListMessagesInput,
  ListMessagesOutput
> {
  constructor(
    private readonly chats: ChatRepository,
    private readonly messages: MessageRepository,
    private readonly users: ChatUserDirectory,
  ) {}

  async execute(input: ListMessagesInput): Promise<ListMessagesOutput> {
    await ensureCanChat(this.users, input.actorId);
    const chat = await findChatOfParticipant(
      this.chats,
      input.chatId,
      input.actorId,
    );
    const participant = chat.findParticipant(input.actorId);
    if (!participant) throw new Error('Participante não encontrado.');

    const limit = Math.min(Math.max(input.limit, 1), LIST_MESSAGES_MAX_LIMIT);
    const page = await this.messages.listByChat({
      chatId: chat.id,
      visibleSince: participant.joinedAt,
      before: input.before,
      limit: limit + 1,
    });

    const hasMore = page.length > limit;
    const messages = page.slice(0, limit);
    const last = messages.at(-1);

    return {
      messages: messages.map(toMessageView),
      nextCursor:
        hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
    };
  }
}
