import { Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface MercadoPagoOAuthToken {
  access_token: string;
  refresh_token: string;
  user_id: number | string;
  expires_in: number;
}

export interface MercadoPagoPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

export interface MercadoPagoPayment {
  id: number | string;
  external_reference: string | null;
  status: string;
  status_detail: string | null;
  transaction_amount: number;
  currency_id: string;
  collector_id: number | string;
  payment_type_id: string | null;
  payment_method_id: string | null;
  date_approved: string | null;
}

@Injectable()
export class MercadoPagoClient {
  getAuthorizationUrl(state: string): string {
    const url = new URL('https://auth.mercadopago.com/authorization');
    url.search = new URLSearchParams({
      client_id: this.requiredEnv('MERCADO_PAGO_CLIENT_ID'),
      response_type: 'code',
      platform_id: 'mp',
      redirect_uri: this.requiredEnv('MERCADO_PAGO_REDIRECT_URI'),
      state,
    }).toString();
    return url.toString();
  }

  async exchangeAuthorizationCode(
    code: string,
  ): Promise<MercadoPagoOAuthToken> {
    return this.requestOAuthToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.requiredEnv('MERCADO_PAGO_REDIRECT_URI'),
      client_id: this.requiredEnv('MERCADO_PAGO_CLIENT_ID'),
      client_secret: this.requiredEnv('MERCADO_PAGO_CLIENT_SECRET'),
    });
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<MercadoPagoOAuthToken> {
    return this.requestOAuthToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.requiredEnv('MERCADO_PAGO_CLIENT_ID'),
      client_secret: this.requiredEnv('MERCADO_PAGO_CLIENT_SECRET'),
    });
  }

  async createPreference(
    accessToken: string,
    input: {
      title: string;
      rentAmountInCents: number;
      platformFeePercent: number;
      platformFeeInCents: number;
      externalReference: string;
      notificationUrl: string;
      successUrl: string;
      pendingUrl: string;
      failureUrl: string;
    },
  ): Promise<MercadoPagoPreferenceResponse> {
    const response = await this.requestJson(
      'https://api.mercadopago.com/checkout/preferences',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              title: input.title,
              quantity: 1,
              currency_id: 'BRL',
              unit_price: input.rentAmountInCents / 100,
            },
            ...(input.platformFeeInCents > 0
              ? [
                  {
                    title: `Taxa da plataforma Moraê (${input.platformFeePercent}%)`,
                    quantity: 1,
                    currency_id: 'BRL',
                    unit_price: input.platformFeeInCents / 100,
                  },
                ]
              : []),
          ],
          marketplace_fee: input.platformFeeInCents / 100,
          external_reference: input.externalReference,
          notification_url: input.notificationUrl,
          back_urls: {
            success: input.successUrl,
            pending: input.pendingUrl,
            failure: input.failureUrl,
          },
          auto_return: 'approved',
          payment_methods: {
            excluded_payment_methods: [],
            excluded_payment_types: [],
          },
        }),
      },
    );

    if (
      typeof response.id !== 'string' ||
      typeof response.init_point !== 'string' ||
      (response.sandbox_init_point !== undefined &&
        typeof response.sandbox_init_point !== 'string')
    ) {
      throw new ServiceUnavailableException(
        'O Mercado Pago retornou uma preferência de checkout inválida.',
      );
    }

    return {
      id: response.id,
      init_point: response.init_point,
      ...(response.sandbox_init_point
        ? { sandbox_init_point: response.sandbox_init_point }
        : {}),
    };
  }

  async getPayment(
    accessToken: string,
    paymentId: string,
  ): Promise<MercadoPagoPayment> {
    const response = await this.requestJson(
      `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (
      (typeof response.id !== 'number' && typeof response.id !== 'string') ||
      typeof response.status !== 'string' ||
      typeof response.transaction_amount !== 'number' ||
      typeof response.currency_id !== 'string' ||
      (typeof response.collector_id !== 'number' &&
        typeof response.collector_id !== 'string')
    ) {
      throw new ServiceUnavailableException(
        'O Mercado Pago retornou dados de pagamento inválidos.',
      );
    }

    return {
      id: response.id,
      external_reference:
        typeof response.external_reference === 'string'
          ? response.external_reference
          : null,
      status: response.status,
      status_detail:
        typeof response.status_detail === 'string'
          ? response.status_detail
          : null,
      transaction_amount: response.transaction_amount,
      currency_id: response.currency_id,
      collector_id: response.collector_id,
      payment_type_id:
        typeof response.payment_type_id === 'string'
          ? response.payment_type_id
          : null,
      payment_method_id:
        typeof response.payment_method_id === 'string'
          ? response.payment_method_id
          : null,
      date_approved:
        typeof response.date_approved === 'string'
          ? response.date_approved
          : null,
    };
  }

  private async requestOAuthToken(
    body: Record<string, string>,
  ): Promise<MercadoPagoOAuthToken> {
    const response = await this.requestJson(
      'https://api.mercadopago.com/oauth/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    if (
      typeof response.access_token !== 'string' ||
      typeof response.refresh_token !== 'string' ||
      (typeof response.user_id !== 'number' &&
        typeof response.user_id !== 'string') ||
      typeof response.expires_in !== 'number'
    ) {
      throw new ServiceUnavailableException(
        'O Mercado Pago retornou credenciais OAuth inválidas.',
      );
    }

    return {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      user_id: response.user_id,
      expires_in: response.expires_in,
    };
  }

  private async requestJson(
    url: string,
    init: RequestInit,
  ): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível conectar ao Mercado Pago.',
      );
    }

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        'O Mercado Pago não aceitou a solicitação. Verifique a configuração da integração.',
      );
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new ServiceUnavailableException(
        'O Mercado Pago retornou uma resposta inválida.',
      );
    }

    return body as Record<string, unknown>;
  }

  private requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new ServiceUnavailableException(
        `A integração de pagamentos requer a variável ${name}.`,
      );
    }
    return value;
  }
}
