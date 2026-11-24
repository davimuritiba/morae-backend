import {
  ForbiddenException,
  Injectable,
  SetMetadata,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountType } from '../../../modules/user/domain/enums/account-type.enum.js';
import { AccountTypeAccessDeniedError } from '../../../modules/user/domain/errors/account-type-access-denied.error.js';
import { UserRepository } from '../../../modules/user/domain/repositories/user.repository.js';
import type { AuthenticatedRequest } from './jwt-auth.guard.js';

const REQUIRED_ACCOUNT_TYPES = 'requiredAccountTypes';

export function RequireAccountTypes(...types: AccountType[]) {
  return SetMetadata(REQUIRED_ACCOUNT_TYPES, types);
}

@Injectable()
export class AccountTypeGuard implements CanActivate {
  constructor(
    private readonly users: UserRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTypes = this.reflector.getAllAndOverride<
      readonly AccountType[]
    >(REQUIRED_ACCOUNT_TYPES, [context.getHandler(), context.getClass()]);
    if (!requiredTypes?.length) {
      throw new ForbiddenException('Tipo de conta permitido não configurado.');
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const accountType = await this.users.findAccountType(request.user.userId);
    if (!requiredTypes.includes(accountType)) {
      throw new AccountTypeAccessDeniedError();
    }

    return true;
  }
}
