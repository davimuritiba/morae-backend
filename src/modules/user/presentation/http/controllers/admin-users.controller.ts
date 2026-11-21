import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChangeUserAccountStatusUseCase } from '../../../application/use-cases/change-user-account-status/change-user-account-status.use-case.js';
import { GetAdminUserUseCase } from '../../../application/use-cases/get-admin-user/get-admin-user.use-case.js';
import { ListAdminUsersUseCase } from '../../../application/use-cases/list-admin-users/list-admin-users.use-case.js';
import { Permission } from '../../../domain/enums/permission.enum.js';
import {
  AdminPermissionsGuard,
  RequireAdminPermission,
} from '../../../../../shared/presentation/guards/admin-permissions.guard.js';
import { ChangeUserAccountStatusDto } from '../dtos/change-user-account-status.dto.js';
import { ListAdminUsersDto } from '../dtos/list-admin-users.dto.js';

@Controller('admin/users')
@UseGuards(AdminPermissionsGuard)
@RequireAdminPermission(Permission.MANAGE_USERS)
export class AdminUsersController {
  constructor(
    private readonly listUsers: ListAdminUsersUseCase,
    private readonly getUser: GetAdminUserUseCase,
    private readonly changeUserAccountStatus: ChangeUserAccountStatusUseCase,
  ) {}

  @Get()
  list(@Query() query: ListAdminUsersDto) {
    return this.listUsers.execute({
      search: query.search,
      status: query.status,
      page: query.page ?? 1,
      limit: query.limit ?? 25,
    });
  }

  @Get(':userId')
  getById(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.getUser.execute(userId);
  }

  @Patch(':userId/status')
  changeStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() input: ChangeUserAccountStatusDto,
  ) {
    return this.changeUserAccountStatus.execute(userId, input.status);
  }
}
