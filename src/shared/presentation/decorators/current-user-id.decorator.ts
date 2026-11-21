import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../guards/jwt-auth.guard.js';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user.userId,
);
