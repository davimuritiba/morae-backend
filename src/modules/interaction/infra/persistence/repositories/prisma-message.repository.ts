import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../../../shared/infra/database/prisma-transaction-context.js';
import { isUuid } from '../../../../../shared/infra/database/uuid.js';
import type { Message } from '../../../domain/entities/message.entity.js';
import {
  MessageRepository,
  type ListMessagesParams,
} from '../../../domain/repositories/message.repository.js';
import { MessageMapper } from '../mappers/message.mapper.js';

@Injectable()
export class PrismaMessageRepository extends MessageRepository {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async listByChat(params: ListMessagesParams): Promise<Message[]> {
    if (!isUuid(params.chatId)) return [];
    const { before } = params;

    const rows = await this.db.client.message.findMany({
      where: {
        chatId: params.chatId,
        createdAt: { gte: params.visibleSince },
        ...(before && {
          OR: [
            { createdAt: { lt: before.createdAt } },
            { createdAt: before.createdAt, id: { lt: before.id } },
          ],
        }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: params.limit,
    });
    return rows.map((row) => MessageMapper.toDomain(row));
  }

  async save(message: Message): Promise<void> {
    const data = MessageMapper.toPersistence(message);

    await this.db.client.message.upsert({
      where: { id: data.id },
      create: data,
      update: {},
    });
  }
}
