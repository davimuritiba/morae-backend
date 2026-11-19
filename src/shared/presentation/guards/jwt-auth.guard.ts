import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthTokenService } from '../../infra/auth/auth-token.service.js';

export interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: AuthTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }

    const payload = await this.tokens.verify(token);
    if (!payload) {
      throw new UnauthorizedException();
    }

    request.user = { userId: payload.userId };
    return true;
  }
}
