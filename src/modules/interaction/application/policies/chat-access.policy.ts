import type { Chat } from '../../domain/entities/chat.entity.js';
import { ChatAccessDeniedError } from '../../domain/errors/chat-access-denied.error.js';
import { ChatNotFoundError } from '../../domain/errors/chat-not-found.error.js';
import { EmailNotVerifiedError } from '../../domain/errors/email-not-verified.error.js';
import type { ChatRepository } from '../../domain/repositories/chat.repository.js';
import type {
  ChatUser,
  ChatUserDirectory,
} from '../ports/chat-user-directory.port.js';

export async function ensureCanChat(
  users: ChatUserDirectory,
  userId: string,
): Promise<ChatUser> {
  const user = await users.findById(userId);
  if (!user || !user.active) {
    throw new ChatAccessDeniedError();
  }
  if (!user.emailVerified) {
    throw new EmailNotVerifiedError();
  }
  return user;
}

export function isReachable(user: ChatUser | null): user is ChatUser {
  return user !== null && user.active && user.emailVerified;
}

export async function findChatOfParticipant(
  chats: ChatRepository,
  chatId: string,
  userId: string,
): Promise<Chat> {
  const chat = await chats.findById(chatId);
  if (!chat || !chat.hasParticipant(userId)) {
    throw new ChatNotFoundError();
  }
  return chat;
}
