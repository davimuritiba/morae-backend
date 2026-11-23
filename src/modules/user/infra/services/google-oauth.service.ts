import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthTokenService } from '../../../../shared/infra/auth/auth-token.service.js';
import { PrismaService } from '../../../../shared/infra/database/prisma.service.js';
import { resolveAccountType } from '../../domain/enums/account-type.enum.js';

const GOOGLE_AUTHORIZATION_ENDPOINT =
  'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT =
  'https://openidconnect.googleapis.com/v1/userinfo';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_CODE_TTL_MS = 2 * 60 * 1000;

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

@Injectable()
export class GoogleOAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AuthTokenService,
  ) {}

  async createAuthorizationUrl(): Promise<{
    authorizationUrl: string;
    state: string;
  }> {
    const config = this.config();
    const state = randomBytes(32).toString('base64url');
    const now = new Date();

    await this.prisma.externalAuthState.deleteMany({
      where: { provider: 'GOOGLE', expiresAt: { lte: now } },
    });
    await this.prisma.externalAuthCode.deleteMany({
      where: { provider: 'GOOGLE', expiresAt: { lte: now } },
    });
    await this.prisma.externalAuthState.create({
      data: {
        id: randomUUID(),
        provider: 'GOOGLE',
        stateHash: this.hash(state),
        expiresAt: new Date(now.getTime() + OAUTH_STATE_TTL_MS),
      },
    });

    const authorization = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
    authorization.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    }).toString();
    return { authorizationUrl: authorization.toString(), state };
  }

  async completeAuthorization(code: string, state: string) {
    if (!code || code.length > 4096 || !state || state.length > 256) {
      throw new UnauthorizedException('Retorno do Google inválido.');
    }

    const stateResult = await this.prisma.externalAuthState.deleteMany({
      where: {
        provider: 'GOOGLE',
        stateHash: this.hash(state),
        expiresAt: { gt: new Date() },
      },
    });
    if (stateResult.count !== 1) {
      throw new UnauthorizedException(
        'A tentativa de login expirou ou já foi utilizada.',
      );
    }

    const config = this.config();
    const tokenResponse = await this.fetchJson(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (
      typeof tokenResponse.access_token !== 'string' ||
      typeof tokenResponse.token_type !== 'string' ||
      tokenResponse.token_type.toLowerCase() !== 'bearer'
    ) {
      throw new UnauthorizedException(
        'O Google não confirmou a autenticação. Tente novamente.',
      );
    }

    const userInfoResponse = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!userInfoResponse.ok) {
      throw new UnauthorizedException(
        'Não foi possível confirmar sua conta Google.',
      );
    }
    const userInfo: unknown = await userInfoResponse.json();
    if (
      !isRecord(userInfo) ||
      typeof userInfo.sub !== 'string' ||
      userInfo.sub.length === 0 ||
      typeof userInfo.email !== 'string' ||
      userInfo.email_verified !== true
    ) {
      throw new UnauthorizedException(
        'O Google não forneceu um e-mail verificado.',
      );
    }

    const googleUser: GoogleUserInfo = {
      sub: userInfo.sub,
      email: userInfo.email.trim().toLowerCase(),
      email_verified: userInfo.email_verified,
      ...(typeof userInfo.name === 'string' ? { name: userInfo.name } : {}),
      ...(typeof userInfo.picture === 'string'
        ? { picture: userInfo.picture }
        : {}),
    };
    const user = await this.prisma.$transaction(async (transaction) => {
      const linkedIdentity = await transaction.googleIdentity.findUnique({
        where: { subject: googleUser.sub },
        include: { user: true },
      });

      if (linkedIdentity) {
        if (linkedIdentity.user.status !== 'ACTIVE') {
          throw new ForbiddenException('Esta conta Moraê não está ativa.');
        }
        return linkedIdentity.user;
      }

      const existingUser = await transaction.user.findFirst({
        where: {
          email: { equals: googleUser.email, mode: 'insensitive' },
        },
      });
      if (!existingUser) {
        throw new NotFoundException(
          'Não encontramos uma conta Moraê com este e-mail. Cadastre-se primeiro.',
        );
      }
      if (existingUser.status !== 'ACTIVE') {
        throw new ForbiddenException('Esta conta Moraê não está ativa.');
      }
      const currentIdentity = await transaction.googleIdentity.findUnique({
        where: { userId: existingUser.id },
      });
      if (currentIdentity && currentIdentity.subject !== googleUser.sub) {
        throw new ConflictException(
          'Esta conta Moraê já está vinculada a outro Google.',
        );
      }

      const updatedUser = existingUser.emailVerified
        ? existingUser
        : await transaction.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: true },
          });
      await transaction.googleIdentity.create({
        data: {
          id: randomUUID(),
          userId: updatedUser.id,
          subject: googleUser.sub,
        },
      });
      return updatedUser;
    });

    const loginCode = randomBytes(32).toString('base64url');
    await this.prisma.externalAuthCode.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        provider: 'GOOGLE',
        codeHash: this.hash(loginCode),
        expiresAt: new Date(Date.now() + OAUTH_CODE_TTL_MS),
      },
    });
    return { code: loginCode };
  }

  async exchangeLoginCode(code: string) {
    if (!code || code.length > 256) {
      throw new UnauthorizedException('Código de login inválido.');
    }

    const user = await this.prisma.$transaction(async (transaction) => {
      const loginCode = await transaction.externalAuthCode.findFirst({
        where: {
          provider: 'GOOGLE',
          codeHash: this.hash(code),
          expiresAt: { gt: new Date() },
        },
      });
      if (!loginCode) {
        throw new UnauthorizedException(
          'O código de login expirou ou já foi utilizado.',
        );
      }

      const consumed = await transaction.externalAuthCode.deleteMany({
        where: { id: loginCode.id, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1) {
        throw new UnauthorizedException(
          'O código de login expirou ou já foi utilizado.',
        );
      }

      const user = await transaction.user.findUnique({
        where: { id: loginCode.userId },
        include: {
          student: { select: { id: true } },
          propertyOwner: { select: { id: true } },
          administrator: { select: { id: true } },
        },
      });
      if (!user || user.status !== 'ACTIVE') {
        throw new ForbiddenException('Esta conta Moraê não está ativa.');
      }
      return user;
    });

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      accountType: resolveAccountType({
        student: user.student !== null,
        propertyOwner: user.propertyOwner !== null,
        administrator: user.administrator !== null,
      }),
      accessToken: await this.tokens.sign(user.id),
      tokenType: 'Bearer' as const,
    };
  }

  frontendUrl(): string {
    const configured = process.env['APP_WEB_URL']?.trim();
    if (!configured) {
      throw new ServiceUnavailableException(
        'O endereço do aplicativo não está configurado.',
      );
    }
    try {
      const url = new URL(configured);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      return url.toString().replace(/\/$/, '');
    } catch {
      throw new ServiceUnavailableException(
        'O endereço do aplicativo está configurado incorretamente.',
      );
    }
  }

  private config(): {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  } {
    const clientId = process.env['GOOGLE_CLIENT_ID']?.trim();
    const clientSecret = process.env['GOOGLE_CLIENT_SECRET']?.trim();
    const redirectUri = process.env['GOOGLE_OAUTH_REDIRECT_URI']?.trim();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new ServiceUnavailableException(
        'O login com Google ainda não está configurado.',
      );
    }

    try {
      const callback = new URL(redirectUri);
      if (!['http:', 'https:'].includes(callback.protocol)) throw new Error();
    } catch {
      throw new ServiceUnavailableException(
        'A URL de retorno do Google está configurada incorretamente.',
      );
    }
    return { clientId, clientSecret, redirectUri };
  }

  private async fetchJson(
    url: string,
    init: RequestInit,
  ): Promise<Record<string, unknown>> {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      if (error instanceof TypeError || error instanceof DOMException) {
        throw new ServiceUnavailableException(
          'Não foi possível conectar ao Google. Tente novamente.',
        );
      }
      throw error;
    }

    const result: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRecord(result)) {
      throw new UnauthorizedException(
        'O Google não confirmou a autenticação. Tente novamente.',
      );
    }
    return result;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
