import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Prisma } from '../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../shared/infra/database/prisma.service.js';
import {
  MercadoPagoClient,
  type MercadoPagoPreferenceResponse,
} from '../infra/mercado-pago/mercado-pago.client.js';
import { isValidMercadoPagoSignature } from '../infra/mercado-pago/mercado-pago-webhook-signature.js';
import { PaymentTokenCipher } from '../infra/mercado-pago/payment-token-cipher.js';

const PLATFORM_FEE_PERCENT = 5;
const MERCADO_PAGO_PROVIDER = 'MERCADO_PAGO';
const OPEN_PAYMENT_STATUSES = ['PENDING', 'PAID'] as const;
const RENTAL_CONTRACT_TYPES = ['MONTHLY_RENTAL', 'PROPERTY_SHARING'] as const;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CreateRentalContractInput {
  listingId: string;
  tenantEmail: string;
  startsAt: string;
  endsAt?: string;
  dueDay: number;
}

export interface CreateRentCheckoutInput {
  contractId: string;
  period: string;
}

interface MercadoPagoWebhookPayload {
  dataId: string;
  requestId: string;
  signature: string;
  providerUserId: string;
}

@Injectable()
export class PaymentFlowService {
  private readonly logger = new Logger(PaymentFlowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadoPago: MercadoPagoClient,
    private readonly tokenCipher: PaymentTokenCipher,
  ) {}

  async listContracts(userId: string) {
    const contracts = await this.prisma.rentalContract.findMany({
      where: { OR: [{ ownerId: userId }, { tenantId: userId }] },
      include: {
        listing: {
          include: {
            property: {
              include: { residence: true },
            },
          },
        },
        owner: {
          select: {
            name: true,
            email: true,
            paymentProviderConnection: { select: { id: true } },
          },
        },
        tenant: { select: { name: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return contracts.map((contract) => ({
      id: contract.id,
      listingId: contract.listingId,
      listingTitle: contract.listing.title,
      neighborhood: contract.listing.property.residence.neighborhood,
      city: contract.listing.property.residence.city,
      ownerId: contract.ownerId,
      ownerName: contract.owner.name,
      ownerEmail: contract.owner.email,
      ownerMercadoPagoConnected: Boolean(
        contract.owner.paymentProviderConnection,
      ),
      tenantId: contract.tenantId,
      tenantName: contract.tenant.name,
      tenantEmail: contract.tenant.email,
      monthlyRentInCents: this.amountToCents(contract.monthlyRent),
      startsAt: this.dateOnly(contract.startsAt),
      endsAt: contract.endsAt ? this.dateOnly(contract.endsAt) : null,
      dueDay: contract.dueDay,
      status: contract.status,
      ownerAcceptedAt: contract.ownerAcceptedAt.toISOString(),
      tenantAcceptedAt: contract.tenantAcceptedAt?.toISOString() ?? null,
      currentUserIsTenant: contract.tenantId === userId,
    }));
  }

  async listOwnedListings(userId: string) {
    const listings = await this.prisma.listing.findMany({
      where: {
        status: 'APPROVED',
        contractType: { in: [...RENTAL_CONTRACT_TYPES] },
        property: { owner: { userId } },
      },
      include: { property: { include: { residence: true } } },
      orderBy: { title: 'asc' },
    });

    return listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      neighborhood: listing.property.residence.neighborhood,
      city: listing.property.residence.city,
      rentInCents: this.amountToCents(listing.rent),
    }));
  }

  async createContract(userId: string, input: CreateRentalContractInput) {
    if (input.dueDay < 1 || input.dueDay > 28) {
      throw new BadRequestException(
        'O vencimento deve ser entre os dias 1 e 28.',
      );
    }

    const startsAt = this.parseDateOnly(input.startsAt, 'A data inicial');
    const endsAt = input.endsAt
      ? this.parseDateOnly(input.endsAt, 'A data final')
      : null;
    if (endsAt && endsAt <= startsAt) {
      throw new BadRequestException(
        'A data final deve ser posterior à data inicial.',
      );
    }

    const listing = await this.prisma.listing.findFirst({
      where: {
        id: input.listingId,
        status: 'APPROVED',
        contractType: { in: [...RENTAL_CONTRACT_TYPES] },
        property: { owner: { userId } },
      },
      select: {
        id: true,
        rent: true,
        propertyId: true,
        property: { select: { owner: { select: { userId: true } } } },
      },
    });
    if (!listing) {
      throw new NotFoundException(
        'Anúncio mensal aprovado não encontrado para esta conta.',
      );
    }

    const tenant = await this.prisma.user.findUnique({
      where: { email: input.tenantEmail.trim().toLowerCase() },
      select: { id: true, status: true },
    });
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new NotFoundException(
        'Não foi encontrado um inquilino ativo com esse e-mail.',
      );
    }
    if (tenant.id === userId) {
      throw new BadRequestException('O proprietário não pode ser o inquilino.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`rental-contract:${listing.id}:${tenant.id}`}))::text`;
      const existing = await tx.rentalContract.findFirst({
        where: {
          listingId: listing.id,
          tenantId: tenant.id,
          status: { in: ['PENDING', 'ACTIVE'] },
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          'Já existe um contrato aberto para este anúncio e inquilino.',
        );
      }

      const now = new Date();
      const contract = await tx.rentalContract.create({
        data: {
          id: randomUUID(),
          listingId: listing.id,
          ownerId: userId,
          tenantId: tenant.id,
          monthlyRent: listing.rent,
          startsAt,
          ...(endsAt ? { endsAt } : {}),
          dueDay: input.dueDay,
          status: 'PENDING',
          ownerAcceptedAt: now,
          updatedAt: now,
        },
      });
      return { id: contract.id, status: contract.status };
    });
  }

  async acceptContract(userId: string, contractId: string) {
    const existing = await this.prisma.rentalContract.findUnique({
      where: { id: contractId },
      select: { id: true, tenantId: true, status: true },
    });
    if (!existing || existing.tenantId !== userId) {
      throw new NotFoundException('Convite de locação não encontrado.');
    }
    if (existing.status === 'ACTIVE') {
      return { id: existing.id, status: existing.status };
    }
    if (existing.status !== 'PENDING') {
      throw new ConflictException('Este convite não está aguardando aceite.');
    }

    const acceptedAt = new Date();
    const result = await this.prisma.rentalContract.updateMany({
      where: { id: contractId, tenantId: userId, status: 'PENDING' },
      data: {
        status: 'ACTIVE',
        tenantAcceptedAt: acceptedAt,
        updatedAt: acceptedAt,
      },
    });
    if (result.count !== 1) {
      throw new ConflictException(
        'O convite foi atualizado. Atualize a página.',
      );
    }
    return { id: contractId, status: 'ACTIVE' as const };
  }

  async rejectContract(userId: string, contractId: string) {
    const result = await this.prisma.rentalContract.updateMany({
      where: { id: contractId, tenantId: userId, status: 'PENDING' },
      data: { status: 'REJECTED', updatedAt: new Date() },
    });
    if (result.count !== 1) {
      throw new NotFoundException('Convite pendente não encontrado.');
    }
    return { id: contractId, status: 'REJECTED' as const };
  }

  async terminateContract(userId: string, contractId: string) {
    const result = await this.prisma.rentalContract.updateMany({
      where: {
        id: contractId,
        OR: [{ ownerId: userId }, { tenantId: userId }],
        status: { in: ['PENDING', 'ACTIVE'] },
      },
      data: { status: 'TERMINATED', updatedAt: new Date() },
    });
    if (result.count !== 1) {
      throw new NotFoundException('Contrato ativo não encontrado.');
    }
    return { id: contractId, status: 'TERMINATED' as const };
  }

  async getProviderConnection(userId: string) {
    const [owner, connection] = await Promise.all([
      this.prisma.propertyOwner.findUnique({
        where: { userId },
        select: { id: true },
      }),
      this.prisma.paymentProviderConnection.findUnique({
        where: { userId },
        select: { providerUserId: true },
      }),
    ]);

    return {
      canManageContracts: Boolean(owner),
      connected: Boolean(owner && connection),
      platformFeePercent: PLATFORM_FEE_PERCENT,
    };
  }

  async getTransactionStatus(userId: string, transactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        id: transactionId,
        OR: [{ payerId: userId }, { payeeId: userId }],
      },
      select: {
        id: true,
        status: true,
        providerStatus: true,
        amount: true,
        rentAmount: true,
        platformFee: true,
        paymentMethod: true,
        description: true,
        transactionDate: true,
        paidAt: true,
      },
    });
    if (!transaction) {
      throw new NotFoundException('Transação não encontrada para esta conta.');
    }

    return {
      id: transaction.id,
      status: transaction.status,
      providerStatus: transaction.providerStatus,
      amountInCents: this.amountToCents(transaction.amount),
      rentAmountInCents:
        transaction.rentAmount === null
          ? null
          : this.amountToCents(transaction.rentAmount),
      platformFeeInCents:
        transaction.platformFee === null
          ? null
          : this.amountToCents(transaction.platformFee),
      paymentMethod: transaction.paymentMethod,
      description: transaction.description,
      date: this.dateOnly(transaction.transactionDate),
      paidAt: transaction.paidAt?.toISOString() ?? null,
    };
  }

  async startMercadoPagoConnection(userId: string) {
    const owner = await this.prisma.propertyOwner.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!owner) {
      throw new ForbiddenException(
        'Somente proprietários podem conectar uma conta para recebimentos.',
      );
    }

    this.tokenCipher.encrypt('configuration-check');
    const state = randomBytes(32).toString('base64url');
    await this.prisma.paymentOAuthState.create({
      data: {
        id: randomUUID(),
        userId,
        stateHash: createHash('sha256').update(state).digest('hex'),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    return { authorizationUrl: this.mercadoPago.getAuthorizationUrl(state) };
  }

  async completeMercadoPagoConnection(code: string, state: string) {
    if (!code || !state || state.length > 256) {
      throw new BadRequestException('Retorno OAuth inválido.');
    }

    const stateHash = createHash('sha256').update(state).digest('hex');
    const oauthState = await this.prisma.paymentOAuthState.findFirst({
      where: { stateHash, usedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userId: true },
    });
    if (!oauthState) {
      throw new UnauthorizedException(
        'O estado OAuth expirou ou já foi usado.',
      );
    }
    const consumed = await this.prisma.paymentOAuthState.updateMany({
      where: { id: oauthState.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new UnauthorizedException(
        'O estado OAuth expirou ou já foi usado.',
      );
    }

    const owner = await this.prisma.propertyOwner.findUnique({
      where: { userId: oauthState.userId },
      select: { id: true },
    });
    if (!owner) {
      throw new ForbiddenException('A conta não está habilitada para receber.');
    }

    const tokens = await this.mercadoPago.exchangeAuthorizationCode(code);
    const now = new Date();
    await this.prisma.paymentProviderConnection.upsert({
      where: { userId: oauthState.userId },
      create: {
        id: randomUUID(),
        userId: oauthState.userId,
        providerUserId: String(tokens.user_id),
        accessTokenEncrypted: this.tokenCipher.encrypt(tokens.access_token),
        refreshTokenEncrypted: this.tokenCipher.encrypt(tokens.refresh_token),
        expiresAt: new Date(now.getTime() + tokens.expires_in * 1000),
        updatedAt: now,
      },
      update: {
        providerUserId: String(tokens.user_id),
        accessTokenEncrypted: this.tokenCipher.encrypt(tokens.access_token),
        refreshTokenEncrypted: this.tokenCipher.encrypt(tokens.refresh_token),
        expiresAt: new Date(now.getTime() + tokens.expires_in * 1000),
        updatedAt: now,
      },
    });

    return `${this.webAppUrl()}/pagamento-aluguel?mercadopago=connected`;
  }

  async createRentCheckout(
    userId: string,
    input: CreateRentCheckoutInput,
  ): Promise<{ transactionId: string; checkoutUrl: string }> {
    const period = this.parsePeriod(input.period);
    const currentPeriod = new Date();
    currentPeriod.setUTCDate(1);
    currentPeriod.setUTCHours(0, 0, 0, 0);
    if (period > currentPeriod) {
      throw new BadRequestException('Não é possível pagar um mês futuro.');
    }

    const contract = await this.prisma.rentalContract.findFirst({
      where: { id: input.contractId, tenantId: userId, status: 'ACTIVE' },
      include: {
        listing: {
          include: {
            property: {
              select: { id: true, owner: { select: { userId: true } } },
            },
          },
        },
      },
    });
    if (!contract) {
      throw new NotFoundException(
        'Contrato ativo não encontrado para sua conta.',
      );
    }
    if (
      period < this.firstOfMonth(contract.startsAt) ||
      (contract.endsAt && period > this.firstOfMonth(contract.endsAt))
    ) {
      throw new BadRequestException(
        'O período informado está fora da vigência do contrato.',
      );
    }

    const ownerId = contract.ownerId;
    if (
      contract.listing.property.owner.userId !== ownerId ||
      ownerId === userId
    ) {
      throw new ConflictException(
        'Os dados do contrato não permitem cobrar este aluguel.',
      );
    }
    const accessToken = await this.getSellerAccessToken(ownerId);
    const rentAmountInCents = this.amountToCents(contract.monthlyRent);
    const platformFeeInCents = Math.round(
      (rentAmountInCents * PLATFORM_FEE_PERCENT) / 100,
    );
    const totalInCents = rentAmountInCents + platformFeeInCents;
    const periodLabel = input.period;
    const description = `Aluguel ${contract.listing.title} - ${periodLabel}`;

    const reservation = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`rent-payment:${contract.id}:${periodLabel}`}))::text`;
      const existing = await tx.paymentTransaction.findFirst({
        where: {
          rentalContractId: contract.id,
          rentalPeriod: period,
          status: { in: [...OPEN_PAYMENT_STATUSES] },
        },
        select: { id: true, status: true, checkoutUrl: true, createdAt: true },
      });
      if (existing?.status === 'PAID') {
        throw new ConflictException('Este período já está pago.');
      }
      if (existing?.checkoutUrl) {
        return {
          kind: 'existing' as const,
          transactionId: existing.id,
          checkoutUrl: existing.checkoutUrl,
        };
      }
      if (existing) {
        if (Date.now() - existing.createdAt.getTime() < 30_000) {
          throw new ConflictException(
            'O checkout deste período está sendo preparado.',
          );
        }
        await tx.paymentTransaction.update({
          where: { id: existing.id },
          data: {
            status: 'CANCELLED',
            providerStatus: 'preference_creation_timeout',
          },
        });
      }

      const transactionId = randomUUID();
      const now = new Date();
      await tx.paymentTransaction.create({
        data: {
          id: transactionId,
          payerId: userId,
          payeeId: ownerId,
          propertyId: contract.listing.property.id,
          listingId: contract.listingId,
          rentalContractId: contract.id,
          rentalPeriod: period,
          description,
          amount: this.centsToDecimal(totalInCents),
          rentAmount: this.centsToDecimal(rentAmountInCents),
          platformFee: this.centsToDecimal(platformFeeInCents),
          status: 'PENDING',
          provider: MERCADO_PAGO_PROVIDER,
          providerStatus: 'preference_creating',
          transactionDate: now,
        },
      });
      return { kind: 'created' as const, transactionId };
    });
    if (reservation.kind === 'existing') {
      return {
        transactionId: reservation.transactionId,
        checkoutUrl: reservation.checkoutUrl,
      };
    }
    const transactionId = reservation.transactionId;

    let preference: MercadoPagoPreferenceResponse;
    try {
      preference = await this.mercadoPago.createPreference(accessToken, {
        title: description,
        rentAmountInCents,
        platformFeePercent: PLATFORM_FEE_PERCENT,
        platformFeeInCents,
        externalReference: transactionId,
        notificationUrl: this.webhookUrl(),
        successUrl: this.paymentReturnUrl(transactionId, 'approved'),
        pendingUrl: this.paymentReturnUrl(transactionId, 'pending'),
        failureUrl: this.paymentReturnUrl(transactionId, 'rejected'),
      });
    } catch (error) {
      await this.prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'CANCELLED',
          providerStatus: 'preference_creation_failed',
        },
      });
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException(
        'Não foi possível iniciar o checkout. Tente novamente.',
      );
    }

    const sandbox = process.env.MERCADO_PAGO_SANDBOX !== 'false';
    const checkoutUrl = sandbox
      ? preference.sandbox_init_point
      : preference.init_point;
    if (!checkoutUrl) {
      await this.prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'CANCELLED',
          providerStatus: 'sandbox_checkout_unavailable',
        },
      });
      throw new ServiceUnavailableException(
        sandbox
          ? 'O checkout de teste não foi disponibilizado pelo Mercado Pago.'
          : 'O Mercado Pago não disponibilizou o checkout.',
      );
    }
    await this.prisma.paymentTransaction.update({
      where: { id: transactionId },
      data: {
        providerPreferenceId: preference.id,
        providerStatus: 'preference_created',
        checkoutUrl,
      },
    });

    return { transactionId, checkoutUrl };
  }

  async processMercadoPagoWebhook(payload: MercadoPagoWebhookPayload) {
    const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new ServiceUnavailableException(
        'A variável MERCADO_PAGO_WEBHOOK_SECRET precisa ser configurada.',
      );
    }
    if (
      !isValidMercadoPagoSignature({
        dataId: payload.dataId,
        requestId: payload.requestId,
        signature: payload.signature,
        secret: webhookSecret,
      })
    ) {
      throw new UnauthorizedException('Assinatura do webhook inválida.');
    }

    const connection = await this.prisma.paymentProviderConnection.findFirst({
      where: { providerUserId: payload.providerUserId },
      select: { userId: true, providerUserId: true },
    });
    if (!connection) {
      this.logger.warn(
        'Notificação recebida para uma conta Mercado Pago desconectada.',
      );
      return;
    }

    const accessToken = await this.getSellerAccessToken(connection.userId);
    const payment = await this.mercadoPago.getPayment(
      accessToken,
      payload.dataId,
    );
    if (
      String(payment.collector_id) !== connection.providerUserId ||
      !payment.external_reference ||
      !uuidPattern.test(payment.external_reference)
    ) {
      this.logger.warn(
        'Notificação Mercado Pago sem referência/recebedor correspondente.',
      );
      return;
    }

    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: payment.external_reference },
      select: {
        id: true,
        amount: true,
        payeeId: true,
        provider: true,
      },
    });
    if (
      !transaction ||
      transaction.provider !== MERCADO_PAGO_PROVIDER ||
      transaction.payeeId !== connection.userId ||
      payment.currency_id !== 'BRL' ||
      Math.round(payment.transaction_amount * 100) !==
        this.amountToCents(transaction.amount)
    ) {
      this.logger.warn(
        'Pagamento Mercado Pago não corresponde à cobrança registrada.',
      );
      return;
    }

    const mappedStatus = this.mapProviderStatus(payment.status);
    const current = await this.prisma.paymentTransaction.findUnique({
      where: { id: transaction.id },
      select: { status: true },
    });
    if (!current) return;

    const canTransition =
      current.status === 'PENDING' ||
      (current.status === 'PAID' && mappedStatus === 'REFUNDED');
    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        providerPaymentId: String(payment.id),
        providerStatus: payment.status,
        ...(mappedStatus && canTransition
          ? {
              status: mappedStatus,
              ...(mappedStatus === 'PAID'
                ? {
                    paidAt:
                      payment.date_approved &&
                      !Number.isNaN(Date.parse(payment.date_approved))
                        ? new Date(payment.date_approved)
                        : new Date(),
                  }
                : {}),
            }
          : {}),
        ...(canTransition &&
        (payment.payment_type_id || payment.payment_method_id)
          ? { paymentMethod: this.mapPaymentMethod(payment) }
          : {}),
      },
    });
  }

  private async getSellerAccessToken(userId: string): Promise<string> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM payment_provider_connections WHERE user_id = ${userId}::uuid FOR UPDATE`;
        const connection = await tx.paymentProviderConnection.findUnique({
          where: { userId },
        });
        if (!connection) {
          throw new ConflictException(
            'O proprietário precisa conectar sua conta Mercado Pago antes da cobrança.',
          );
        }

        if (connection.expiresAt.getTime() > Date.now() + 60_000) {
          return this.tokenCipher.decrypt(connection.accessTokenEncrypted);
        }

        const tokens = await this.mercadoPago.refreshAccessToken(
          this.tokenCipher.decrypt(connection.refreshTokenEncrypted),
        );
        if (String(tokens.user_id) !== connection.providerUserId) {
          throw new ServiceUnavailableException(
            'A conta conectada do Mercado Pago mudou. Reconecte a conta do proprietário.',
          );
        }
        const now = new Date();
        await tx.paymentProviderConnection.update({
          where: { userId },
          data: {
            providerUserId: String(tokens.user_id),
            accessTokenEncrypted: this.tokenCipher.encrypt(tokens.access_token),
            refreshTokenEncrypted: this.tokenCipher.encrypt(
              tokens.refresh_token,
            ),
            expiresAt: new Date(now.getTime() + tokens.expires_in * 1000),
            updatedAt: now,
          },
        });
        return tokens.access_token;
      },
      { maxWait: 5_000, timeout: 30_000 },
    );
  }

  private mapProviderStatus(
    status: string,
  ): 'PAID' | 'PENDING' | 'REJECTED' | 'CANCELLED' | 'REFUNDED' | null {
    switch (status) {
      case 'approved':
        return 'PAID';
      case 'pending':
      case 'in_process':
      case 'authorized':
      case 'in_mediation':
        return 'PENDING';
      case 'rejected':
        return 'REJECTED';
      case 'cancelled':
        return 'CANCELLED';
      case 'refunded':
      case 'charged_back':
        return 'REFUNDED';
      default:
        return null;
    }
  }

  private mapPaymentMethod(payment: {
    payment_type_id: string | null;
    payment_method_id: string | null;
  }): 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'OTHER' {
    if (payment.payment_method_id === 'pix') return 'PIX';
    if (
      payment.payment_type_id === 'ticket' ||
      payment.payment_method_id?.includes('boleto')
    ) {
      return 'BOLETO';
    }
    if (
      payment.payment_type_id === 'credit_card' ||
      payment.payment_type_id === 'debit_card'
    ) {
      return 'CREDIT_CARD';
    }
    if (payment.payment_type_id === 'bank_transfer') return 'BANK_TRANSFER';
    return 'OTHER';
  }

  private parsePeriod(value: string): Date {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
      throw new BadRequestException('Informe o período no formato AAAA-MM.');
    }
    return new Date(`${value}-01T00:00:00.000Z`);
  }

  private parseDateOnly(value: string, label: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException(`${label} deve usar o formato AAAA-MM-DD.`);
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException(`${label} é inválida.`);
    }
    return date;
  }

  private firstOfMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }

  private dateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private amountToCents(amount: Prisma.Decimal): number {
    return Math.round(amount.toNumber() * 100);
  }

  private centsToDecimal(amountInCents: number): Prisma.Decimal {
    return new Prisma.Decimal((amountInCents / 100).toFixed(2));
  }

  private webAppUrl(): string {
    return (process.env.APP_WEB_URL ?? 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
  }

  private paymentReturnUrl(transactionId: string, result: string): string {
    return `${this.webAppUrl()}/pagamento-aluguel?transaction=${transactionId}&result=${result}`;
  }

  private webhookUrl(): string {
    const value = process.env.MERCADO_PAGO_WEBHOOK_URL;
    if (!value) {
      throw new ServiceUnavailableException(
        'MERCADO_PAGO_WEBHOOK_URL precisa apontar para um endpoint público HTTPS.',
      );
    }
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      throw new ServiceUnavailableException(
        'MERCADO_PAGO_WEBHOOK_URL precisa usar HTTPS.',
      );
    }
    return url.toString();
  }
}
