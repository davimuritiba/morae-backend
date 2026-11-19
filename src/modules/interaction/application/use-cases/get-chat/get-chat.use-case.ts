import type { UseCase } from '../../../../../shared/application/use-case.js';
import { ChatNotFoundError } from '../../../domain/errors/chat-not-found.error.js';
import { ensureCanChat } from '../../policies/chat-access.policy.js';
import type {
  ChatInboxQuery,
  ChatSummaryView,
} from '../../ports/chat-inbox.query.js';
import type { ChatUserDirectory } from '../../ports/chat-user-directory.port.js';

export interface GetChatInput {
  actorId: string;
  chatId: string;
}

export class GetChatUseCase implements UseCase<GetChatInput, ChatSummaryView> {
  constructor(
    private readonly inbox: ChatInboxQuery,
    private readonly users: ChatUserDirectory,
  ) {}

  async execute(input: GetChatInput): Promise<ChatSummaryView> {
    await ensureCanChat(this.users, input.actorId);

    const chat = await this.inbox.findForUser(input.chatId, input.actorId);
    if (!chat) {
      throw new ChatNotFoundError();
    }
    return chat;
  }
}
