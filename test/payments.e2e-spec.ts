import type { INestApplication } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { AuthTokenService } from '../src/shared/infra/auth/auth-token.service.js';
import { PrismaService } from '../src/shared/infra/database/prisma.service.js';
import {
  MercadoPagoClient,
  type MercadoPagoOAuthToken,
  type MercadoPagoPayment,
  type MercadoPagoPreferenceResponse,
} from '../src/modules/payment/infra/mercado-pago/mercado-pago.client.js';
import { PaymentTokenCipher } from '../src/modules/payment/infra/mercado-pago/payment-token-cipher.js';
import { resetDatabase } from './integration/reset-database.js';

const PAYER_ID = '11111111-1111-4111-8111-111111111111';
const PAYEE_ID = '22222222-2222-4222-8222-222222222222';
const UNRELATED_USER_ID = '33333333-3333-4333-8333-333333333333';
const PROPERTY_OWNER_ID = '55555555-5555-4555-8555-555555555555';
const RESIDENCE_ID = '66666666-6666-4666-8666-666666666666';
const PROPERTY_ID = '77777777-7777-4777-8777-777777777777';
const LISTING_ID = '88888888-8888-4888-8888-888888888888';
const PROVIDER_USER_ID = 'mp-owner-1';
const WEBHOOK_SECRET = 'test-webhook-secret';

class FakeMercadoPagoClient extends MercadoPagoClient {
  private nextPreferenceId = 0;
  readonly preferences: Array<{
    externalReference: string;
    rentAmountInCents: number;
    platformFeeInCents: number;
  }> = [];
  readonly payments = new Map<string, MercadoPagoPayment>();
  readonly refreshedTokens: string[] = [];

  override async exchangeAuthorizationCode(
    _code: string,
  ): Promise<MercadoPagoOAuthToken> {
    return {
      access_token: 'oauth-access-token',
      refresh_token: 'oauth-refresh-token',
      user_id: PROVIDER_USER_ID,
      expires_in: 3600,
    };
  }

  override async refreshAccessToken(
    refreshToken: string,
  ): Promise<MercadoPagoOAuthToken> {
    this.refreshedTokens.push(refreshToken);
    return {
      access_token: 'refreshed-access-token',
      refresh_token: 'rotated-refresh-token',
      user_id: PROVIDER_USER_ID,
      expires_in: 3600,
    };
  }

  override async createPreference(
    _accessToken: string,
    input: Parameters<MercadoPagoClient['createPreference']>[1],
  ): Promise<MercadoPagoPreferenceResponse> {
    this.nextPreferenceId += 1;
    this.preferences.push({
      externalReference: input.externalReference,
      rentAmountInCents: input.rentAmountInCents,
      platformFeeInCents: input.platformFeeInCents,
    });
    const id = `preference-${this.nextPreferenceId}`;
    return {
      id,
      init_point: `https://www.mercadopago.com/checkout/${id}`,
      sandbox_init_point: `https://sandbox.mercadopago.com/checkout/${id}`,
    };
  }

  override async getPayment(
    _accessToken: string,
    paymentId: string,
  ): Promise<MercadoPagoPayment> {
    const payment = this.payments.get(paymentId);
    if (!payment) throw new Error('Test payment not found');
    return payment;
  }
}

describe('GET /payments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let payeeToken: string;
  let mercadoPago: FakeMercadoPagoClient;

  beforeAll(async () => {
    process.env.PAYMENT_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
      'base64',
    );
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.MERCADO_PAGO_WEBHOOK_URL =
      'https://api.example.test/webhooks/mercado-pago';
    process.env.MERCADO_PAGO_CLIENT_ID = 'test-client-id';
    process.env.MERCADO_PAGO_CLIENT_SECRET = 'test-client-secret';
    process.env.MERCADO_PAGO_REDIRECT_URI =
      'http://localhost:3000/payments/mercado-pago/callback';
    process.env.MERCADO_PAGO_SANDBOX = 'true';
    process.env.APP_WEB_URL = 'http://localhost:5173';
    mercadoPago = new FakeMercadoPagoClient();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MercadoPagoClient)
      .useValue(mercadoPago)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    const updatedAt = new Date('2026-11-01T12:00:00.000Z');
    await prisma.user.createMany({
      data: [
        {
          id: PAYER_ID,
          name: 'Pagador',
          email: 'pagador@example.com',
          cpf: '00000000001',
          passwordHash: 'test-hash',
          updatedAt,
        },
        {
          id: PAYEE_ID,
          name: 'Recebedor',
          email: 'recebedor@example.com',
          cpf: '00000000002',
          passwordHash: 'test-hash',
          updatedAt,
        },
        {
          id: UNRELATED_USER_ID,
          name: 'Outra pessoa',
          email: 'outra@example.com',
          cpf: '00000000003',
          passwordHash: 'test-hash',
          updatedAt,
        },
      ],
    });
    await prisma.paymentTransaction.createMany({
      data: [
        {
          id: '10101010-1010-4010-8010-101010101001',
          payerId: PAYER_ID,
          payeeId: PAYEE_ID,
          description: 'Aluguel novembro',
          amount: '700.00',
          status: 'PAID',
          paymentMethod: 'PIX',
          transactionDate: new Date('2026-11-02T00:00:00.000Z'),
        },
        {
          id: '10101010-1010-4010-8010-101010101002',
          payerId: PAYER_ID,
          payeeId: PAYEE_ID,
          description: 'Aluguel outubro',
          amount: '600.00',
          status: 'PENDING',
          paymentMethod: 'BOLETO',
          transactionDate: new Date('2026-10-10T00:00:00.000Z'),
        },
        {
          id: '10101010-1010-4010-8010-101010101003',
          payerId: UNRELATED_USER_ID,
          payeeId: PAYER_ID,
          description: 'Outra locação',
          amount: '500.00',
          status: 'PAID',
          paymentMethod: 'PIX',
          transactionDate: new Date('2026-11-03T00:00:00.000Z'),
        },
      ],
    });
    await prisma.propertyOwner.create({
      data: {
        id: PROPERTY_OWNER_ID,
        userId: PAYER_ID,
        updatedAt,
      },
    });
    await prisma.residence.create({
      data: {
        id: RESIDENCE_ID,
        postalCode: '57000000',
        state: 'AL',
        street: 'Rua de Teste',
        number: '10',
        city: 'Maceió',
        neighborhood: 'Centro',
        updatedAt,
      },
    });
    await prisma.property.create({
      data: {
        id: PROPERTY_ID,
        ownerId: PROPERTY_OWNER_ID,
        residenceId: RESIDENCE_ID,
        housingType: 'APARTMENT',
        bedrooms: 2,
        bathrooms: 1,
        updatedAt,
      },
    });
    await prisma.listing.create({
      data: {
        id: LISTING_ID,
        propertyId: PROPERTY_ID,
        title: 'Apartamento de teste',
        description: 'Anúncio de teste para cobrança de aluguel',
        rent: '1000.00',
        contractType: 'MONTHLY_RENTAL',
        minimumStay: 'THREE_MONTHS',
        status: 'APPROVED',
        updatedAt,
      },
    });
    payeeToken = await app.get(AuthTokenService).sign(PAYEE_ID);
  });

  function getPayments() {
    return request(app.getHttpServer()).get('/payments');
  }

  async function createActiveContract(): Promise<string> {
    const ownerToken = await app.get(AuthTokenService).sign(PAYER_ID);
    const invitation = await request(app.getHttpServer())
      .post('/rental-contracts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        listingId: LISTING_ID,
        tenantEmail: 'recebedor@example.com',
        startsAt: '2020-01-01',
        dueDay: 5,
      })
      .expect(201);
    const contractId = invitation.body.id as string;
    await request(app.getHttpServer())
      .post(`/rental-contracts/${contractId}/accept`)
      .set('Authorization', `Bearer ${payeeToken}`)
      .expect(201);
    return contractId;
  }

  async function connectOwnerAccount(expired = false) {
    const cipher = app.get(PaymentTokenCipher);
    await prisma.paymentProviderConnection.create({
      data: {
        id: '99999999-9999-4999-8999-999999999999',
        userId: PAYER_ID,
        providerUserId: PROVIDER_USER_ID,
        accessTokenEncrypted: cipher.encrypt('seller-access-token'),
        refreshTokenEncrypted: cipher.encrypt('seller-refresh-token'),
        expiresAt: new Date(Date.now() + (expired ? -1000 : 60 * 60 * 1000)),
        updatedAt: new Date(),
      },
    });
  }

  function currentAndPreviousPeriod(offsetMonths = 0): string {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCMonth(date.getUTCMonth() + offsetMonths);
    return date.toISOString().slice(0, 7);
  }

  function sendPaymentWebhook(
    transactionId: string,
    status: string,
    paymentId: string,
  ) {
    mercadoPago.payments.set(paymentId, {
      id: paymentId,
      external_reference: transactionId,
      status,
      status_detail: status,
      transaction_amount: 1050,
      currency_id: 'BRL',
      collector_id: PROVIDER_USER_ID,
      payment_type_id: status === 'approved' ? 'bank_transfer' : 'credit_card',
      payment_method_id: status === 'approved' ? 'pix' : 'visa',
      date_approved: status === 'approved' ? new Date().toISOString() : null,
    });
    const requestId = `request-${paymentId}`;
    const timestamp = '1790000000';
    const manifest = `id:${paymentId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
    const signature = createHmac('sha256', WEBHOOK_SECRET)
      .update(manifest)
      .digest('hex');
    return request(app.getHttpServer())
      .post('/webhooks/mercado-pago')
      .query({ type: 'payment', 'data.id': paymentId })
      .set('x-request-id', requestId)
      .set('x-signature', `ts=${timestamp},v1=${signature}`)
      .send({
        type: 'payment',
        user_id: PROVIDER_USER_ID,
        data: { id: paymentId },
      });
  }

  it('requires authentication and returns only the current user transactions', async () => {
    await getPayments().expect(401);

    const response = await getPayments()
      .set('Authorization', `Bearer ${payeeToken}`)
      .expect(200);

    expect(response.body).toMatchObject([
      {
        id: '10101010-1010-4010-8010-101010101001',
        amountInCents: 70000,
        rentAmountInCents: null,
        platformFeeInCents: null,
        direction: 'INCOMING',
        counterpartyName: 'Pagador',
      },
      {
        id: '10101010-1010-4010-8010-101010101002',
        amountInCents: 60000,
        rentAmountInCents: null,
        platformFeeInCents: null,
        direction: 'INCOMING',
        counterpartyName: 'Pagador',
      },
    ]);
  });

  it('applies period and status query filters', async () => {
    const response = await getPayments()
      .query({ from: '2026-10-10', to: '2026-10-10', status: 'PENDING' })
      .set('Authorization', `Bearer ${payeeToken}`)
      .expect(200);

    expect(response.body).toMatchObject([
      {
        id: '10101010-1010-4010-8010-101010101002',
        date: '2026-10-10',
        status: 'PENDING',
      },
    ]);
  });

  it('rejects reversed date ranges and unknown query parameters', async () => {
    await getPayments()
      .query({ from: '2026-11-30', to: '2026-11-01' })
      .set('Authorization', `Bearer ${payeeToken}`)
      .expect(400);

    await getPayments()
      .query({ userId: PAYER_ID })
      .set('Authorization', `Bearer ${payeeToken}`)
      .expect(400);
  });

  it('connects only owners through a one-time OAuth state', async () => {
    const ownerToken = await app.get(AuthTokenService).sign(PAYER_ID);
    const tenantConnection = await request(app.getHttpServer())
      .get('/payments/mercado-pago/connection')
      .set('Authorization', `Bearer ${payeeToken}`)
      .expect(200);
    expect(tenantConnection.body).toMatchObject({
      canManageContracts: false,
      connected: false,
      platformFeePercent: 5,
    });

    await request(app.getHttpServer())
      .post('/payments/mercado-pago/connect')
      .set('Authorization', `Bearer ${payeeToken}`)
      .expect(403);

    const connect = await request(app.getHttpServer())
      .post('/payments/mercado-pago/connect')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(201);
    const authorization = new URL(connect.body.authorizationUrl);
    expect(authorization.origin).toBe('https://auth.mercadopago.com');
    expect(authorization.searchParams.get('client_id')).toBe('test-client-id');
    const state = authorization.searchParams.get('state');
    expect(state).toBeTruthy();

    const callback = await request(app.getHttpServer())
      .get('/payments/mercado-pago/callback')
      .query({ code: 'authorization-code', state })
      .expect(302);
    expect(callback.headers.location).toBe(
      'http://localhost:5173/pagamento-aluguel?mercadopago=connected',
    );
    const connection = await prisma.paymentProviderConnection.findUniqueOrThrow(
      { where: { userId: PAYER_ID } },
    );
    const cipher = app.get(PaymentTokenCipher);
    expect(connection.accessTokenEncrypted).not.toContain('oauth-access-token');
    expect(cipher.decrypt(connection.accessTokenEncrypted)).toBe(
      'oauth-access-token',
    );
    expect(cipher.decrypt(connection.refreshTokenEncrypted)).toBe(
      'oauth-refresh-token',
    );

    await request(app.getHttpServer())
      .get('/payments/mercado-pago/callback')
      .query({ code: 'authorization-code', state })
      .expect(401);
  });

  it('requires both parties to activate a contract before checkout', async () => {
    const ownerToken = await app.get(AuthTokenService).sign(PAYER_ID);
    const invitation = await request(app.getHttpServer())
      .post('/rental-contracts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        listingId: LISTING_ID,
        tenantEmail: 'recebedor@example.com',
        startsAt: '2020-01-01',
        dueDay: 5,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/payments/checkout')
      .set('Authorization', `Bearer ${payeeToken}`)
      .send({
        contractId: invitation.body.id,
        period: currentAndPreviousPeriod(),
      })
      .expect(404);

    await request(app.getHttpServer())
      .post(`/rental-contracts/${invitation.body.id}/accept`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/rental-contracts/${invitation.body.id}/accept`)
      .set('Authorization', `Bearer ${payeeToken}`)
      .expect(201);

    const contracts = await request(app.getHttpServer())
      .get('/rental-contracts')
      .set('Authorization', `Bearer ${payeeToken}`)
      .expect(200);
    expect(contracts.body[0]).toMatchObject({
      id: invitation.body.id,
      status: 'ACTIVE',
      currentUserIsTenant: true,
      monthlyRentInCents: 100000,
    });
  });

  it('creates one checkout with a 5% platform fee and persists pending, rejected, and paid outcomes', async () => {
    await connectOwnerAccount(true);
    const contractId = await createActiveContract();
    const period = currentAndPreviousPeriod();
    const checkout = await request(app.getHttpServer())
      .post('/payments/checkout')
      .set('Authorization', `Bearer ${payeeToken}`)
      .send({ contractId, period })
      .expect(201);

    expect(checkout.body).toMatchObject({
      transactionId: expect.any(String),
      checkoutUrl: expect.stringContaining('sandbox.mercadopago.com'),
    });
    expect(mercadoPago.preferences).toHaveLength(1);
    expect(mercadoPago.refreshedTokens).toEqual(['seller-refresh-token']);
    expect(mercadoPago.preferences[0]).toMatchObject({
      externalReference: checkout.body.transactionId,
      rentAmountInCents: 100000,
      platformFeeInCents: 5000,
    });

    const transaction = await prisma.paymentTransaction.findUniqueOrThrow({
      where: { id: checkout.body.transactionId },
    });
    expect(transaction.amount.toFixed(2)).toBe('1050.00');
    expect(transaction.status).toBe('PENDING');
    const refreshedConnection =
      await prisma.paymentProviderConnection.findUniqueOrThrow({
        where: { userId: PAYER_ID },
      });
    expect(
      app
        .get(PaymentTokenCipher)
        .decrypt(refreshedConnection.accessTokenEncrypted),
    ).toBe('refreshed-access-token');

    const duplicate = await request(app.getHttpServer())
      .post('/payments/checkout')
      .set('Authorization', `Bearer ${payeeToken}`)
      .send({ contractId, period })
      .expect(201);
    expect(duplicate.body).toEqual(checkout.body);
    expect(mercadoPago.preferences).toHaveLength(1);

    await sendPaymentWebhook(transaction.id, 'pending', '90000001').expect(200);
    let updated = await prisma.paymentTransaction.findUniqueOrThrow({
      where: { id: transaction.id },
    });
    expect(updated.status).toBe('PENDING');

    await sendPaymentWebhook(transaction.id, 'rejected', '90000001').expect(
      200,
    );
    updated = await prisma.paymentTransaction.findUniqueOrThrow({
      where: { id: transaction.id },
    });
    expect(updated.status).toBe('REJECTED');

    const paidCheckout = await request(app.getHttpServer())
      .post('/payments/checkout')
      .set('Authorization', `Bearer ${payeeToken}`)
      .send({ contractId, period: currentAndPreviousPeriod(-1) })
      .expect(201);
    await sendPaymentWebhook(
      paidCheckout.body.transactionId,
      'approved',
      '90000002',
    ).expect(200);
    await sendPaymentWebhook(
      paidCheckout.body.transactionId,
      'rejected',
      '90000002',
    ).expect(200);

    const paid = await prisma.paymentTransaction.findUniqueOrThrow({
      where: { id: paidCheckout.body.transactionId },
    });
    expect(paid.status).toBe('PAID');
    expect(paid.paymentMethod).toBe('PIX');
    expect(paid.paidAt).toBeInstanceOf(Date);

    const receipt = await request(app.getHttpServer())
      .get(`/payments/${paidCheckout.body.transactionId}`)
      .set('Authorization', `Bearer ${payeeToken}`)
      .expect(200);
    expect(receipt.body).toMatchObject({
      id: paidCheckout.body.transactionId,
      status: 'PAID',
      amountInCents: 105000,
      rentAmountInCents: 100000,
      platformFeeInCents: 5000,
      paymentMethod: 'PIX',
      paidAt: expect.any(String),
    });

    const unrelatedToken = await app
      .get(AuthTokenService)
      .sign(UNRELATED_USER_ID);
    await request(app.getHttpServer())
      .get(`/payments/${paidCheckout.body.transactionId}`)
      .set('Authorization', `Bearer ${unrelatedToken}`)
      .expect(404);
  });

  it('does not process a Mercado Pago notification with an invalid signature', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/mercado-pago')
      .query({ type: 'payment', 'data.id': '90000003' })
      .set('x-request-id', 'request-invalid')
      .set('x-signature', 'ts=1790000000,v1=invalid')
      .send({
        type: 'payment',
        user_id: PROVIDER_USER_ID,
        data: { id: '90000003' },
      })
      .expect(401);
  });
});
