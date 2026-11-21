import type { ChatSummaryView } from '../../../application/ports/chat-inbox.query.js';
import type { MessageView } from '../../../application/views/message.view.js';
import type { ChatType } from '../../../domain/enums/chat-type.enum.js';
import type { ParticipantRole } from '../../../domain/enums/participant-role.enum.js';

export interface MessageResponse {
  id: string;
  chatId: string;
  senderId: string;
  content: string | null;
  listingId: string | null;
  createdAt: string;
}

export interface ChatParticipantResponse {
  userId: string;
  name: string;
  photoUrl: string | null;
  role: ParticipantRole;
  lastReadAt: string | null;
}

export interface ChatResponse {
  id: string;
  type: ChatType;
  name: string | null;
  participants: ChatParticipantResponse[];
  lastMessage: MessageResponse | null;
  unreadCount: number;
  lastActivityAt: string;
  createdAt: string;
}

export interface PageResponse<T> {
  data: T[];
  nextCursor: string | null;
}

export class ChatPresenter {
  static message(view: MessageView): MessageResponse {
    return {
      id: view.id,
      chatId: view.chatId,
      senderId: view.senderId,
      content: view.content,
      listingId: view.listingId,
      createdAt: view.createdAt.toISOString(),
    };
  }

  static chat(view: ChatSummaryView): ChatResponse {
    return {
      id: view.id,
      type: view.type,
      name: view.name,
      participants: view.participants.map((p) => ({
        userId: p.userId,
        name: p.name,
        photoUrl: p.photoUrl,
        role: p.role,
        lastReadAt: p.lastReadAt?.toISOString() ?? null,
      })),
      lastMessage: view.lastMessage
        ? ChatPresenter.message(view.lastMessage)
        : null,
      unreadCount: view.unreadCount,
      lastActivityAt: view.lastActivityAt.toISOString(),
      createdAt: view.createdAt.toISOString(),
    };
  }
}
