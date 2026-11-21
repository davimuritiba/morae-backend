import type {
  UserPaymentTransaction,
  UserPaymentTransactionQuery,
} from '../payment-transaction.js';

export abstract class PaymentTransactionRepository {
  abstract findForUser(
    query: UserPaymentTransactionQuery,
  ): Promise<UserPaymentTransaction[]>;
}
