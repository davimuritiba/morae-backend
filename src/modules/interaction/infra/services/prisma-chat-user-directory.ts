import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../../shared/infra/database/prisma-transaction-context.js';
import { isUuid } from '../../../../shared/infra/database/uuid.js';
import {
  ChatUserDirectory,
  type ChatUser,
} from '../../application/ports/chat-user-directory.port.js';

const SELECT = { id: true, emailVerified: true, status: true } as const;

@Injectable()
export class PrismaChatUserDirectory extends ChatUserDirectory {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findById(userId: string): Promise<ChatUser | null> {
    if (!isUuid(userId)) return null;

    const row = await this.db.client.user.findUnique({
      where: { id: userId },
      select: SELECT,
    });
    return row ? toChatUser(row) : null;
  }

  async findByIds(userIds: string[]): Promise<ChatUser[]> {
    const ids = userIds.filter(isUuid);
    if (ids.length === 0) return [];

    const rows = await this.db.client.user.findMany({
      where: { id: { in: ids } },
      select: SELECT,
    });
    return rows.map(toChatUser);
  }
}

function toChatUser(row: {
  id: string;
  emailVerified: boolean;
  status: string;
}): ChatUser {
  return {
    id: row.id,
    emailVerified: row.emailVerified,
    active: row.status === 'ACTIVE',
  };
}
