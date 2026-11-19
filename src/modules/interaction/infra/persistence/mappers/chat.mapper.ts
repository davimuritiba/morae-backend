import type {
  Chat as PrismaChat,
  ChatParticipant as PrismaChatParticipant,
} from '../../../../../shared/infra/database/generated/prisma/client.js';
import { ChatParticipant } from '../../../domain/entities/chat-participant.entity.js';
import { Chat } from '../../../domain/entities/chat.entity.js';
import { ChatType } from '../../../domain/enums/chat-type.enum.js';
import { ParticipantRole } from '../../../domain/enums/participant-role.enum.js';
import { GroupName } from '../../../domain/value-objects/group-name.vo.js';

export type PrismaChatWithParticipants = PrismaChat & {
  participants: PrismaChatParticipant[];
};

export class ChatMapper {
  static toDomain(raw: PrismaChatWithParticipants): Chat {
    return Chat.restore(raw.id, {
      type: ChatType[raw.type],
      name: raw.name === null ? null : GroupName.create(raw.name),
      createdBy: raw.createdBy,
      directKey: raw.directKey,
      participants: raw.participants.map((p) =>
        ChatParticipant.restore({
          userId: p.userId,
          role: ParticipantRole[p.role],
          joinedAt: p.joinedAt,
          lastReadAt: p.lastReadAt,
        }),
      ),
      lastMessageAt: raw.lastMessageAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(chat: Chat): PrismaChat {
    return {
      id: chat.id,
      type: chat.type,
      name: chat.name?.value ?? null,
      createdBy: chat.createdBy,
      directKey: chat.directKey,
      lastMessageAt: chat.lastMessageAt,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }
}
