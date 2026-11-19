import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaTransactionContext } from '../../../../../shared/infra/database/prisma-transaction-context.js';
import { isUuid } from '../../../../../shared/infra/database/uuid.js';
import {
  ChatInboxQuery,
  type ChatMemberView,
  type ChatSummaryView,
  type ListInboxParams,
} from '../../../application/ports/chat-inbox.query.js';
import { ChatType } from '../../../domain/enums/chat-type.enum.js';
import { ParticipantRole } from '../../../domain/enums/participant-role.enum.js';

interface InboxRow {
  id: string;
  type: keyof typeof ChatType;
  name: string | null;
  createdAt: Date;
  lastActivityAt: Date;
  unreadCount: number;
  lmId: string | null;
  lmSenderId: string | null;
  lmContent: string | null;
  lmListingId: string | null;
  lmCreatedAt: Date | null;
}

@Injectable()
export class PrismaChatInboxQuery extends ChatInboxQuery {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async listForUser(params: ListInboxParams): Promise<ChatSummaryView[]> {
    if (!isUuid(params.userId)) return [];

    const { before } = params;
    const filter = before
      ? Prisma.sql`AND (COALESCE(c.last_message_at, c.created_at), c.id) < (${before.lastActivityAt}::timestamptz, ${before.id}::uuid)`
      : Prisma.empty;

    return this.query(params.userId, filter, params.limit);
  }

  async findForUser(
    chatId: string,
    userId: string,
  ): Promise<ChatSummaryView | null> {
    if (!isUuid(chatId) || !isUuid(userId)) return null;

    const [chat] = await this.query(
      userId,
      Prisma.sql`AND c.id = ${chatId}::uuid`,
      1,
    );
    return chat ?? null;
  }

  private async query(
    userId: string,
    filter: Prisma.Sql,
    limit: number,
  ): Promise<ChatSummaryView[]> {
    const client = this.db.client;

    const rows = await client.$queryRaw<InboxRow[]>`
      SELECT
        c.id,
        c.type::text AS type,
        c.name,
        c.created_at AS "createdAt",
        COALESCE(c.last_message_at, c.created_at) AS "lastActivityAt",
        (
          SELECT COUNT(*)::int FROM messages m
          WHERE m.chat_id = c.id
            AND m.sender_id <> me.user_id
            AND m.created_at >= me.joined_at
            AND (me.last_read_at IS NULL OR m.created_at > me.last_read_at)
        ) AS "unreadCount",
        lm.id AS "lmId",
        lm.sender_id AS "lmSenderId",
        lm.content AS "lmContent",
        lm.listing_id AS "lmListingId",
        lm.created_at AS "lmCreatedAt"
      FROM chat_participants me
      JOIN chats c ON c.id = me.chat_id
      LEFT JOIN LATERAL (
        SELECT m.id, m.sender_id, m.content, m.listing_id, m.created_at
        FROM messages m
        WHERE m.chat_id = c.id AND m.created_at >= me.joined_at
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT 1
      ) lm ON true
      WHERE me.user_id = ${userId}::uuid ${filter}
      ORDER BY "lastActivityAt" DESC, c.id DESC
      LIMIT ${limit}`;

    if (rows.length === 0) return [];

    const participants = await client.chatParticipant.findMany({
      where: { chatId: { in: rows.map((r) => r.id) } },
      include: { user: { select: { name: true, photoUrl: true } } },
      orderBy: [{ joinedAt: 'asc' }, { userId: 'asc' }],
    });

    const membersByChat = new Map<string, ChatMemberView[]>();
    for (const p of participants) {
      const members = membersByChat.get(p.chatId) ?? [];
      members.push({
        userId: p.userId,
        name: p.user.name,
        photoUrl: p.user.photoUrl,
        role: ParticipantRole[p.role],
        lastReadAt: p.lastReadAt,
      });
      membersByChat.set(p.chatId, members);
    }

    return rows.map((row) => ({
      id: row.id,
      type: ChatType[row.type],
      name: row.name,
      participants: membersByChat.get(row.id) ?? [],
      lastMessage:
        row.lmId && row.lmSenderId && row.lmCreatedAt
          ? {
              id: row.lmId,
              chatId: row.id,
              senderId: row.lmSenderId,
              content: row.lmContent,
              listingId: row.lmListingId,
              createdAt: new Date(row.lmCreatedAt),
            }
          : null,
      unreadCount: Number(row.unreadCount),
      lastActivityAt: new Date(row.lastActivityAt),
      createdAt: new Date(row.createdAt),
    }));
  }
}
