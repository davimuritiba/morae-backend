import type { ChatType } from '../../domain/enums/chat-type.enum.js';
import type { ParticipantRole } from '../../domain/enums/participant-role.enum.js';
import type { MessageView } from '../views/message.view.js';

export interface ChatMemberView {
  userId: string;
  name: string;
  photoUrl: string | null;
  role: ParticipantRole;
  lastReadAt: Date | null;
}

export interface ChatSummaryView {
  id: string;
  type: ChatType;
  name: string | null;
  participants: ChatMemberView[];
  lastMessage: MessageView | null;
  unreadCount: number;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface InboxCursor {
  lastActivityAt: Date;
  id: string;
}

export interface ListInboxParams {
  userId: string;
  before: InboxCursor | null;
  limit: number;
}

export abstract class ChatInboxQuery {
  // Ordenado por (lastActivityAt, id) decrescente. lastActivityAt é a data da
  // última mensagem, ou a de criação da conversa se ainda não houver nenhuma.
  abstract listForUser(params: ListInboxParams): Promise<ChatSummaryView[]>;
  abstract findForUser(
    chatId: string,
    userId: string,
  ): Promise<ChatSummaryView | null>;
}
