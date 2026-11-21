import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentFlowService } from '../../../application/payment-flow.service.js';

@Controller('payments/mercado-pago')
export class MercadoPagoCallbackController {
  constructor(private readonly paymentFlow: PaymentFlowService) {}

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    const appUrl = (process.env.APP_WEB_URL ?? 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
    if (error) {
      return response.redirect(
        302,
        `${appUrl}/pagamento-aluguel?mercadopago=cancelled`,
      );
    }

    const redirectUrl = await this.paymentFlow.completeMercadoPagoConnection(
      code ?? '',
      state ?? '',
    );
    return response.redirect(302, redirectUrl);
  }
}
