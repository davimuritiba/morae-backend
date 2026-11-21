import { Module } from '@nestjs/common';
import { ListUserPaymentTransactionsUseCase } from './application/use-cases/list-user-payment-transactions/list-user-payment-transactions.use-case.js';
import { PaymentTransactionRepository } from './domain/repositories/payment-transaction.repository.js';
import { PrismaPaymentTransactionRepository } from './infra/persistence/repositories/prisma-payment-transaction.repository.js';
import { PaymentTransactionsController } from './presentation/http/controllers/payment-transactions.controller.js';
import { PaymentFlowService } from './application/payment-flow.service.js';
import { MercadoPagoClient } from './infra/mercado-pago/mercado-pago.client.js';
import { PaymentTokenCipher } from './infra/mercado-pago/payment-token-cipher.js';
import { RentalContractsController } from './presentation/http/controllers/rental-contracts.controller.js';
import { MercadoPagoCallbackController } from './presentation/http/controllers/mercado-pago-callback.controller.js';
import { MercadoPagoWebhookController } from './presentation/http/controllers/mercado-pago-webhook.controller.js';

@Module({
  providers: [
    MercadoPagoClient,
    PaymentTokenCipher,
    PaymentFlowService,
    PrismaPaymentTransactionRepository,
    {
      provide: PaymentTransactionRepository,
      useExisting: PrismaPaymentTransactionRepository,
    },
    {
      provide: ListUserPaymentTransactionsUseCase,
      useFactory: (payments: PaymentTransactionRepository) =>
        new ListUserPaymentTransactionsUseCase(payments),
      inject: [PaymentTransactionRepository],
    },
  ],
  controllers: [
    PaymentTransactionsController,
    RentalContractsController,
    MercadoPagoCallbackController,
    MercadoPagoWebhookController,
  ],
})
export class PaymentModule {}
