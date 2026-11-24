import { IsIn, IsISO8601, IsOptional } from 'class-validator';
import { PAYMENT_TRANSACTION_STATUSES } from '../../../domain/payment-transaction.js';
import type { PaymentTransactionStatus } from '../../../domain/payment-transaction.js';

export class ListPaymentTransactionsQueryDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string;

  @IsOptional()
  @IsIn(PAYMENT_TRANSACTION_STATUSES)
  status?: PaymentTransactionStatus;
}
