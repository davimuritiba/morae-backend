import type { PaymentTransactionRepository } from '../../../domain/repositories/payment-transaction.repository.js';
import type {
  UserPaymentTransaction,
  UserPaymentTransactionQuery,
} from '../../../domain/payment-transaction.js';

export class ListUserPaymentTransactionsUseCase {
  constructor(private readonly payments: PaymentTransactionRepository) {}

  execute(
    query: UserPaymentTransactionQuery,
  ): Promise<UserPaymentTransaction[]> {
    return this.payments.findForUser(query);
  }
}
