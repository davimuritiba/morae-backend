import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthTokenService } from '../../../infra/auth/auth-token.service.js';
import { PrismaService } from '../../../infra/database/prisma.service.js';
import { JwtAuthGuard } from '../../../presentation/guards/jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  const tokens = new AuthTokenService(
    new JwtService({ secret: 'unit-test-secret-with-at-least-32-bytes' }),
  );
  const findUser = vi.fn();
  const prisma = { user: { findUnique: findUser } } as unknown as PrismaService;
  const guard = new JwtAuthGuard(tokens, prisma);

  beforeEach(() => {
    findUser.mockResolvedValue({ status: 'ACTIVE' });
  });

  function makeContext(headers: Record<string, string> = {}) {
    const request = { headers } as import('express').Request & {
      user?: { userId: string };
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    return { context, request };
  }

  it('rejects requests without a bearer token', async () => {
    const { context } = makeContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches the authenticated user id from a valid token', async () => {
    const userId = 'c0a80123-0000-4000-8000-000000000001';
    const token = await tokens.sign(userId);
    const { context, request } = makeContext({
      authorization: `Bearer ${token}`,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ userId });
  });

  it('rejects a user whose account was suspended after token issuance', async () => {
    findUser.mockResolvedValue({ status: 'SUSPENDED' });
    const token = await tokens.sign('user-id');
    const { context } = makeContext({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
