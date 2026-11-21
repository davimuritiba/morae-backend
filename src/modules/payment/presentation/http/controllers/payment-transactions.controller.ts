import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { ListUserPaymentTransactionsUseCase } from '../../../application/use-cases/list-user-payment-transactions/list-user-payment-transactions.use-case.js';
import type { UserPaymentTransaction } from '../../../domain/payment-transaction.js';
import { ListPaymentTransactionsQueryDto } from '../dtos/list-payment-transactions.query.dto.js';
import { CreateRentCheckoutDto } from '../dtos/create-rent-checkout.dto.js';
import { PaymentFlowService } from '../../../application/payment-flow.service.js';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentTransactionsController {
  constructor(
    private readonly listUserPaymentTransactions: ListUserPaymentTransactionsUseCase,
    private readonly paymentFlow: PaymentFlowService,
  ) {}

  @Get()
  async listForCurrentUser(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListPaymentTransactionsQueryDto,
  ): Promise<UserPaymentTransaction[]> {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException(
        'A data inicial deve ser anterior ou igual à data final.',
      );
    }

    return this.listUserPaymentTransactions.execute({
      userId: request.user.userId,
      ...(query.from ? { from: new Date(`${query.from}T00:00:00.000Z`) } : {}),
      ...(query.to ? { to: new Date(`${query.to}T00:00:00.000Z`) } : {}),
      ...(query.status ? { status: query.status } : {}),
    });
  }

  @Get('mercado-pago/connection')
  getMercadoPagoConnection(@Req() request: AuthenticatedRequest) {
    return this.paymentFlow.getProviderConnection(request.user.userId);
  }

  @Post('mercado-pago/connect')
  connectMercadoPago(@Req() request: AuthenticatedRequest) {
    return this.paymentFlow.startMercadoPagoConnection(request.user.userId);
  }

  @Post('checkout')
  createRentCheckout(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateRentCheckoutDto,
  ) {
    return this.paymentFlow.createRentCheckout(request.user.userId, body);
  }

  @Get(':transactionId')
  getTransactionStatus(
    @Req() request: AuthenticatedRequest,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
  ) {
    return this.paymentFlow.getTransactionStatus(
      request.user.userId,
      transactionId,
    );
  }
}
