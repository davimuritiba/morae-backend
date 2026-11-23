import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Permission } from '../../../../modules/user/domain/enums/permission.enum.js';
import { AuthTokenService } from '../../../infra/auth/auth-token.service.js';
import { PrismaService } from '../../../infra/database/prisma.service.js';
import { AdminPermissionsGuard } from '../../../presentation/guards/admin-permissions.guard.js';

describe('AdminPermissionsGuard', () => {
  const tokens = new AuthTokenService(
    new JwtService({ secret: 'unit-test-secret-with-at-least-32-bytes' }),
  );
  const findUser = vi.fn();
  const prisma = { user: { findUnique: findUser } } as unknown as PrismaService;
  const getAllAndOverride = vi.fn();
  const reflector = { getAllAndOverride } as unknown as Reflector;
  const guard = new AdminPermissionsGuard(tokens, prisma, reflector);

  beforeEach(() => {
    getAllAndOverride.mockReturnValue(Permission.MODERATE_LISTINGS);
    findUser.mockResolvedValue({ status: 'ACTIVE' });
  });

  function makeContext(token?: string) {
    const request = {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    } as import('express').Request;
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
  }

  it('rejects a regular user token', async () => {
    const token = await tokens.sign('user-id');

    await expect(guard.canActivate(makeContext(token))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects administrators without the required permission', async () => {
    const token = await tokens.signAdministrator('user-id', 'admin-id', [
      Permission.MANAGE_USERS,
    ]);

    await expect(guard.canActivate(makeContext(token))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows active administrators with the required permission', async () => {
    const token = await tokens.signAdministrator('user-id', 'admin-id', [
      Permission.MODERATE_LISTINGS,
    ]);

    await expect(guard.canActivate(makeContext(token))).resolves.toBe(true);
  });

  it('requires every permission configured for a sensitive admin action', async () => {
    getAllAndOverride.mockReturnValue([
      Permission.VIEW_REPORTS,
      Permission.MANAGE_USERS,
    ]);
    const token = await tokens.signAdministrator('user-id', 'admin-id', [
      Permission.VIEW_REPORTS,
    ]);

    await expect(guard.canActivate(makeContext(token))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows a sensitive admin action when every permission is present', async () => {
    getAllAndOverride.mockReturnValue([
      Permission.VIEW_REPORTS,
      Permission.MANAGE_USERS,
    ]);
    const token = await tokens.signAdministrator('user-id', 'admin-id', [
      Permission.VIEW_REPORTS,
      Permission.MANAGE_USERS,
    ]);

    await expect(guard.canActivate(makeContext(token))).resolves.toBe(true);
  });

  it('rejects an administrator whose account has been suspended', async () => {
    findUser.mockResolvedValue({ status: 'SUSPENDED' });
    const token = await tokens.signAdministrator('user-id', 'admin-id', [
      Permission.MODERATE_LISTINGS,
    ]);

    await expect(guard.canActivate(makeContext(token))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
