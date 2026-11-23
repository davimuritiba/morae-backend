import { JwtService } from '@nestjs/jwt';
import { AuthTokenService } from '../../../../../shared/infra/auth/auth-token.service.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { GoogleOAuthService } from '../../../infra/services/google-oauth.service.js';

describe('GoogleOAuthService', () => {
  const existingUser = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Maria Silva',
    email: 'maria@ufal.br',
    status: 'ACTIVE',
    emailVerified: false,
  };
  let stateRecord: Record<string, unknown> | null;
  let loginCodeRecord: Record<string, unknown> | null;
  let linkedIdentity: Record<string, unknown> | null;
  let fetchMock: ReturnType<typeof vi.fn>;
  let service: GoogleOAuthService;
  let userUpdate: ReturnType<typeof vi.fn>;
  let identityCreate: ReturnType<typeof vi.fn>;
  let userFindFirst: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env['GOOGLE_CLIENT_ID'] = 'google-client-id';
    process.env['GOOGLE_CLIENT_SECRET'] = 'google-client-secret';
    process.env['GOOGLE_OAUTH_REDIRECT_URI'] =
      'https://api.example.test/auth/google/callback';
    process.env['APP_WEB_URL'] = 'https://app.example.test';
    stateRecord = null;
    loginCodeRecord = null;
    linkedIdentity = null;
    userUpdate = vi.fn(async () => ({ ...existingUser, emailVerified: true }));
    identityCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      linkedIdentity = { ...data, user: { ...existingUser, emailVerified: true } };
      return linkedIdentity;
    });
    userFindFirst = vi.fn(
      async (): Promise<typeof existingUser | null> => existingUser,
    );

    const transaction = {
      externalAuthCode: {
        findFirst: vi.fn(async () => loginCodeRecord),
        deleteMany: vi.fn(
          async ({ where }: { where: { id: string; expiresAt: { gt: Date } } }) => {
            if (
              loginCodeRecord &&
              loginCodeRecord['id'] === where.id
            ) {
              loginCodeRecord = null;
              return { count: 1 };
            }
            return { count: 0 };
          },
        ),
      },
      googleIdentity: {
        findUnique: vi.fn(async () => linkedIdentity),
        create: identityCreate,
      },
      user: {
        findFirst: userFindFirst,
        findUnique: vi.fn(async () => existingUser),
        update: userUpdate,
      },
    };
    const prisma = {
      externalAuthState: {
        deleteMany: vi.fn(
          async ({
            where,
          }: {
            where: {
              stateHash?: string;
              expiresAt: { gt?: Date; lte?: Date };
            };
          }) => {
            if (where.expiresAt.lte) return { count: 0 };
            if (
              stateRecord &&
              stateRecord.stateHash === where.stateHash &&
              where.expiresAt.gt &&
              where.expiresAt.gt.getTime() <= Date.now()
            ) {
              stateRecord = null;
              return { count: 1 };
            }
            return { count: 0 };
          },
        ),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          stateRecord = data;
          return data;
        }),
      },
      externalAuthCode: {
        deleteMany: vi.fn(async () => ({ count: 0 })),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          loginCodeRecord = data;
          return data;
        }),
      },
      $transaction: vi.fn(
        async <T>(callback: (tx: typeof transaction) => Promise<T>) =>
          callback(transaction),
      ),
    } as unknown as PrismaService;
    const tokens = new AuthTokenService(
      new JwtService({ secret: 'unit-test-secret-with-at-least-32-bytes' }),
    );
    service = new GoogleOAuthService(prisma, tokens);

    fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url === 'https://oauth2.googleapis.com/token') {
        return Response.json({
          access_token: 'google-access-token',
          token_type: 'Bearer',
        });
      }
      return Response.json({
        sub: 'google-subject-123',
        email: 'maria@ufal.br',
        email_verified: true,
        name: 'Maria Silva',
      });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env['GOOGLE_CLIENT_ID'];
    delete process.env['GOOGLE_CLIENT_SECRET'];
    delete process.env['GOOGLE_OAUTH_REDIRECT_URI'];
    delete process.env['APP_WEB_URL'];
  });

  it('creates a Google authorization URL with a random one-time state', async () => {
    const result = await service.createAuthorizationUrl();
    const authorization = new URL(result.authorizationUrl);

    expect(authorization.origin + authorization.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(authorization.searchParams.get('client_id')).toBe('google-client-id');
    expect(authorization.searchParams.get('redirect_uri')).toBe(
      'https://api.example.test/auth/google/callback',
    );
    expect(authorization.searchParams.get('state')).toBe(result.state);
    expect(authorization.searchParams.get('scope')).toContain('email');
    expect(stateRecord).toMatchObject({ provider: 'GOOGLE' });
    expect(stateRecord?.stateHash).not.toBe(result.state);
  });

  it('links a verified Google identity to the matching active Moraê account', async () => {
    const { state } = await service.createAuthorizationUrl();
    const login = await service.completeAuthorization('authorization-code', state);
    const result = await service.exchangeLoginCode(login.code);

    expect(result).toMatchObject({
      userId: existingUser.id,
      email: existingUser.email,
      tokenType: 'Bearer',
    });
    expect(result.accessToken).toEqual(expect.any(String));
    expect(userFindFirst).toHaveBeenCalledWith({
      where: { email: { equals: 'maria@ufal.br', mode: 'insensitive' } },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: existingUser.id },
      data: { emailVerified: true },
    });
    expect(identityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: existingUser.id,
        subject: 'google-subject-123',
      }),
    });
    await expect(service.exchangeLoginCode(login.code)).rejects.toMatchObject({
      status: 401,
    });
  });

  it('rejects a reused state before contacting Google', async () => {
    const { state } = await service.createAuthorizationUrl();
    await service.completeAuthorization('authorization-code', state);
    fetchMock.mockClear();

    await expect(
      service.completeAuthorization('another-code', state),
    ).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not link an unverified Google email', async () => {
    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url === 'https://oauth2.googleapis.com/token') {
        return Response.json({
          access_token: 'google-access-token',
          token_type: 'Bearer',
        });
      }
      return Response.json({
        sub: 'google-subject-123',
        email: 'maria@ufal.br',
        email_verified: false,
      });
    });
    const { state } = await service.createAuthorizationUrl();

    await expect(
      service.completeAuthorization('authorization-code', state),
    ).rejects.toMatchObject({ status: 401 });
    expect(userFindFirst).not.toHaveBeenCalled();
    expect(identityCreate).not.toHaveBeenCalled();
  });

  it('requires an existing Moraê account instead of creating an incomplete one', async () => {
    userFindFirst.mockResolvedValue(null);
    const { state } = await service.createAuthorizationUrl();

    await expect(
      service.completeAuthorization('authorization-code', state),
    ).rejects.toMatchObject({ status: 404 });
    expect(identityCreate).not.toHaveBeenCalled();
  });
});
