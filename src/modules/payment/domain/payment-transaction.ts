export const PAYMENT_TRANSACTION_STATUSES = [
  'PENDING',
  'PAID',
  'REJECTED',
  'OVERDUE',
  'CANCELLED',
  'REFUNDED',
] as const;

export type PaymentTransactionStatus =
  (typeof PAYMENT_TRANSACTION_STATUSES)[number];

export const PAYMENT_METHODS = [
  'PIX',
  'BOLETO',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'OTHER',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface UserPaymentTransaction {
  id: string;
  description: string;
  date: string;
  amountInCents: number;
  rentAmountInCents: number | null;
  platformFeeInCents: number | null;
  status: PaymentTransactionStatus;
  paymentMethod: PaymentMethod | null;
  direction: 'INCOMING' | 'OUTGOING';
  counterpartyName: string;
}

export interface UserPaymentTransactionQuery {
  userId: string;
  from?: Date;
  to?: Date;
  status?: PaymentTransactionStatus;
}
