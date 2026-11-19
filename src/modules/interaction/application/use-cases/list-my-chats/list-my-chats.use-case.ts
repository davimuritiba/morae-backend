import type { UseCase } from '../../../../../shared/application/use-case.js';
import { ensureCanChat } from '../../policies/chat-access.policy.js';
import type {
  ChatInboxQuery,
  ChatSummaryView,
  InboxCursor,
} from '../../ports/chat-inbox.query.js';
import type { ChatUserDirectory } from '../../ports/chat-user-directory.port.js';

export const LIST_CHATS_MAX_LIMIT = 50;

export interface ListMyChatsInput {
  actorId: string;
  before: InboxCursor | null;
  limit: number;
}

export interface ListMyChatsOutput {
  chats: ChatSummaryView[];
  nextCursor: InboxCursor | null;
}

export class ListMyChatsUseCase implements UseCase<
  ListMyChatsInput,
  ListMyChatsOutput
> {
  constructor(
    private readonly inbox: ChatInboxQuery,
    private readonly users: ChatUserDirectory,
  ) {}

  async execute(input: ListMyChatsInput): Promise<ListMyChatsOutput> {
    await ensureCanChat(this.users, input.actorId);

    const limit = Math.min(Math.max(input.limit, 1), LIST_CHATS_MAX_LIMIT);
    const page = await this.inbox.listForUser({
      userId: input.actorId,
      before: input.before,
      limit: limit + 1,
    });

    const hasMore = page.length > limit;
    const chats = page.slice(0, limit);
    const last = chats.at(-1);

    return {
      chats,
      nextCursor:
        hasMore && last
          ? { lastActivityAt: last.lastActivityAt, id: last.id }
          : null,
    };
  }
}
