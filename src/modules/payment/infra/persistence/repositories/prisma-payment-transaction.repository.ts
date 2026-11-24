import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import type {
  UserPaymentTransaction,
  UserPaymentTransactionQuery,
} from '../../../domain/payment-transaction.js';
import { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';

@Injectable()
export class PrismaPaymentTransactionRepository extends PaymentTransactionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findForUser(
    query: UserPaymentTransactionQuery,
  ): Promise<UserPaymentTransaction[]> {
    const dateFilter: Prisma.DateTimeFilter = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
    const where: Prisma.PaymentTransactionWhereInput = {
      OR: [{ payerId: query.userId }, { payeeId: query.userId }],
      ...(query.from || query.to ? { transactionDate: dateFilter } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const rows = await this.prisma.paymentTransaction.findMany({
      where,
      include: {
        payer: { select: { name: true } },
        payee: { select: { name: true } },
      },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      description: row.description,
      date: row.transactionDate.toISOString().slice(0, 10),
      amountInCents: Math.round(row.amount.toNumber() * 100),
      rentAmountInCents:
        row.rentAmount === null
          ? null
          : Math.round(row.rentAmount.toNumber() * 100),
      platformFeeInCents:
        row.platformFee === null
          ? null
          : Math.round(row.platformFee.toNumber() * 100),
      status: row.status,
      paymentMethod: row.paymentMethod,
      direction: row.payeeId === query.userId ? 'INCOMING' : 'OUTGOING',
      counterpartyName:
        row.payerId === query.userId ? row.payee.name : row.payer.name,
    }));
  }
}
