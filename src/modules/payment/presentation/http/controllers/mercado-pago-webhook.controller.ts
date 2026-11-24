import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Query,
} from '@nestjs/common';
import { PaymentFlowService } from '../../../application/payment-flow.service.js';

interface MercadoPagoWebhookBody {
  type?: unknown;
  user_id?: unknown;
  data?: { id?: unknown };
}

@Controller('webhooks/mercado-pago')
export class MercadoPagoWebhookController {
  constructor(private readonly paymentFlow: PaymentFlowService) {}

  @Post()
  @HttpCode(200)
  async receive(
    @Query() query: Record<string, string | undefined>,
    @Body() body: MercadoPagoWebhookBody,
    @Headers('x-signature') signature?: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    const eventType = query.type ?? body.type;
    if (eventType !== 'payment') return { received: true };

    const bodyDataId = body.data?.id;
    const dataId =
      query['data.id'] ??
      (typeof bodyDataId === 'string' || typeof bodyDataId === 'number'
        ? String(bodyDataId)
        : undefined);
    const providerUserId =
      typeof body.user_id === 'string' || typeof body.user_id === 'number'
        ? String(body.user_id)
        : undefined;
    if (!dataId || !signature || !requestId || !providerUserId) {
      throw new BadRequestException('Notificação de pagamento incompleta.');
    }

    await this.paymentFlow.processMercadoPagoWebhook({
      dataId,
      requestId,
      signature,
      providerUserId,
    });
    return { received: true };
  }
}
