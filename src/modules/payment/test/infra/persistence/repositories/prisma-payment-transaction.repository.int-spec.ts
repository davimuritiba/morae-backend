import { PrismaPaymentTransactionRepository } from '../../../../infra/persistence/repositories/prisma-payment-transaction.repository.js';
import { PrismaService } from '../../../../../../shared/infra/database/prisma.service.js';
import { resetDatabase } from '../../../../../../../test/integration/reset-database.js';

describe('PrismaPaymentTransactionRepository (integração)', () => {
  const prisma = new PrismaService();
  const repository = new PrismaPaymentTransactionRepository(prisma);

  beforeEach(async () => {
    await resetDatabase(prisma);
    const updatedAt = new Date('2026-11-01T12:00:00.000Z');
    await prisma.user.createMany({
      data: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Pagador',
          email: 'pagador@example.com',
          cpf: '00000000001',
          passwordHash: 'test-hash',
          updatedAt,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Recebedor',
          email: 'recebedor@example.com',
          cpf: '00000000002',
          passwordHash: 'test-hash',
          updatedAt,
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          name: 'Outra pessoa',
          email: 'outra@example.com',
          cpf: '00000000003',
          passwordHash: 'test-hash',
          updatedAt,
        },
        {
          id: '44444444-4444-4444-8444-444444444444',
          name: 'Sem transações',
          email: 'sem-transacoes@example.com',
          cpf: '00000000004',
          passwordHash: 'test-hash',
          updatedAt,
        },
      ],
    });
    await prisma.paymentTransaction.createMany({
      data: [
        {
          id: '10101010-1010-4010-8010-101010101001',
          payerId: '11111111-1111-4111-8111-111111111111',
          payeeId: '22222222-2222-4222-8222-222222222222',
          description: 'Aluguel novembro',
          amount: '700.00',
          status: 'PAID',
          paymentMethod: 'PIX',
          transactionDate: new Date('2026-11-02T00:00:00.000Z'),
        },
        {
          id: '10101010-1010-4010-8010-101010101002',
          payerId: '33333333-3333-4333-8333-333333333333',
          payeeId: '22222222-2222-4222-8222-222222222222',
          description: 'Aluguel outubro',
          amount: '600.00',
          status: 'PENDING',
          paymentMethod: 'BOLETO',
          transactionDate: new Date('2026-10-10T00:00:00.000Z'),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns only transactions involving the requested user and maps direction and amount', async () => {
    const payerHistory = await repository.findForUser({
      userId: '11111111-1111-4111-8111-111111111111',
    });
    const payeeHistory = await repository.findForUser({
      userId: '22222222-2222-4222-8222-222222222222',
    });
    const unrelatedHistory = await repository.findForUser({
      userId: '44444444-4444-4444-8444-444444444444',
    });

    expect(payerHistory).toMatchObject([
      {
        id: '10101010-1010-4010-8010-101010101001',
        amountInCents: 70000,
        rentAmountInCents: null,
        platformFeeInCents: null,
        direction: 'OUTGOING',
        counterpartyName: 'Recebedor',
      },
    ]);
    expect(payeeHistory).toHaveLength(2);
    expect(payeeHistory[0]).toMatchObject({
      id: '10101010-1010-4010-8010-101010101001',
      direction: 'INCOMING',
      counterpartyName: 'Pagador',
    });
    expect(unrelatedHistory).toEqual([]);
  });

  it('applies inclusive date bounds and status filter', async () => {
    const transactions = await repository.findForUser({
      userId: '22222222-2222-4222-8222-222222222222',
      from: new Date('2026-10-10T00:00:00.000Z'),
      to: new Date('2026-10-10T00:00:00.000Z'),
      status: 'PENDING',
    });

    expect(transactions).toMatchObject([
      {
        id: '10101010-1010-4010-8010-101010101002',
        date: '2026-10-10',
        status: 'PENDING',
      },
    ]);
  });
});
