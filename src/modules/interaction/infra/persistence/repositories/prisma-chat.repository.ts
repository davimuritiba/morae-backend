import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { rethrowUniqueViolation } from '../../../../../shared/infra/database/prisma-errors.js';
import { PrismaTransactionContext } from '../../../../../shared/infra/database/prisma-transaction-context.js';
import { isUuid } from '../../../../../shared/infra/database/uuid.js';
import type { Chat } from '../../../domain/entities/chat.entity.js';
import { DirectChatAlreadyExistsError } from '../../../domain/errors/direct-chat-already-exists.error.js';
import { ChatRepository } from '../../../domain/repositories/chat.repository.js';
import { ChatMapper } from '../mappers/chat.mapper.js';

const UNIQUE_ERRORS = {
  chats_direct_key_key: () => new DirectChatAlreadyExistsError(),
};

const WITH_PARTICIPANTS = {
  participants: { orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }] },
} satisfies Prisma.ChatInclude;

@Injectable()
export class PrismaChatRepository extends ChatRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findById(id: string): Promise<Chat | null> {
    if (!isUuid(id)) return null;

    const row = await this.db.client.chat.findUnique({
      where: { id },
      include: WITH_PARTICIPANTS,
    });
    return row ? ChatMapper.toDomain(row) : null;
  }

  async findByDirectKey(directKey: string): Promise<Chat | null> {
    const row = await this.db.client.chat.findUnique({
      where: { directKey },
      include: WITH_PARTICIPANTS,
    });
    return row ? ChatMapper.toDomain(row) : null;
  }

  async save(chat: Chat): Promise<void> {
    const data = ChatMapper.toPersistence(chat);

    await this.db.runInTransaction(async () => {
      const client = this.db.client;

      try {
        await client.chat.upsert({
          where: { id: data.id },
          create: data,
          update: { name: data.name },
        });
      } catch (error) {
        rethrowUniqueViolation(error, UNIQUE_ERRORS);
      }

      if (data.lastMessageAt) {
        await client.$executeRaw`
          UPDATE chats SET
            last_message_at = GREATEST(last_message_at, ${data.lastMessageAt}::timestamptz),
            updated_at = GREATEST(updated_at, ${data.updatedAt}::timestamptz)
          WHERE id = ${data.id}::uuid`;
      }

      const rows = chat.participants.map(
        (p) =>
          Prisma.sql`(${data.id}::uuid, ${p.userId}::uuid, ${p.role}::"ParticipantRole", ${p.joinedAt}::timestamptz, ${p.lastReadAt}::timestamptz)`,
      );
      await client.$executeRaw`
        INSERT INTO chat_participants (chat_id, user_id, role, joined_at, last_read_at)
        VALUES ${Prisma.join(rows)}
        ON CONFLICT (chat_id, user_id) DO UPDATE SET
          role = EXCLUDED.role,
          last_read_at = GREATEST(chat_participants.last_read_at, EXCLUDED.last_read_at)`;
    });
  }
}
