import { ListUserPaymentTransactionsUseCase } from '../../../application/use-cases/list-user-payment-transactions/list-user-payment-transactions.use-case.js';
import type {
  UserPaymentTransaction,
  UserPaymentTransactionQuery,
} from '../../../domain/payment-transaction.js';
import { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';

class InMemoryPaymentTransactionRepository extends PaymentTransactionRepository {
  query: UserPaymentTransactionQuery | null = null;
  results: UserPaymentTransaction[] = [];

  async findForUser(
    query: UserPaymentTransactionQuery,
  ): Promise<UserPaymentTransaction[]> {
    this.query = query;
    return this.results;
  }
}

describe('ListUserPaymentTransactionsUseCase', () => {
  it('passes the authenticated user and filters to the repository', async () => {
    const repository = new InMemoryPaymentTransactionRepository();
    const useCase = new ListUserPaymentTransactionsUseCase(repository);
    const query: UserPaymentTransactionQuery = {
      userId: '11111111-1111-4111-8111-111111111111',
      from: new Date('2026-11-01T00:00:00.000Z'),
      to: new Date('2026-11-30T00:00:00.000Z'),
      status: 'PAID',
    };
    const transactions: UserPaymentTransaction[] = [
      {
        id: '10101010-1010-4010-8010-101010101001',
        description: 'Aluguel · Novembro/2026',
        date: '2026-11-02',
        amountInCents: 70000,
        rentAmountInCents: null,
        platformFeeInCents: null,
        status: 'PAID',
        paymentMethod: 'PIX',
        direction: 'INCOMING',
        counterpartyName: 'Ana Beatriz Lima',
      },
    ];
    repository.results = transactions;

    await expect(useCase.execute(query)).resolves.toBe(transactions);
    expect(repository.query).toEqual(query);
  });
});
