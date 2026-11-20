import {
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Permission } from '../../../modules/user/domain/enums/permission.enum.js';
import { AuthTokenService } from '../../infra/auth/auth-token.service.js';
import { PrismaService } from '../../infra/database/prisma.service.js';

const REQUIRED_ADMIN_PERMISSION = 'requiredAdminPermission';

export function RequireAdminPermission(permission: Permission) {
  return SetMetadata(REQUIRED_ADMIN_PERMISSION, permission);
}

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(
    private readonly tokens: AuthTokenService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<Permission>(
      REQUIRED_ADMIN_PERMISSION,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermission) {
      throw new ForbiddenException('Permissão administrativa não configurada.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }

    const payload = await this.tokens.verify(token);
    if (!payload?.administratorId) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { status: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }
    if (!payload.permissions?.includes(requiredPermission)) {
      throw new ForbiddenException(
        'Você não tem permissão para esta operação administrativa.',
      );
    }
    return true;
  }
}
