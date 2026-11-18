import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { GetUserByIdUseCase } from '../../../application/use-cases/get-user-by-id/get-user-by-id.use-case.js';
import {
  GetUserByIdPresenter,
  type GetUserByIdResponse,
  type PublicUserResponse,
} from '../presenters/get-user-by-id.presenter.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly getUserById: GetUserByIdUseCase) {}

  @Get('me')
  async me(@CurrentUserId() viewerId: string): Promise<GetUserByIdResponse> {
    return GetUserByIdPresenter.toHttp(
      await this.getUserById.execute(viewerId),
    );
  }

  @Get(':id')
  async getById(
    @CurrentUserId() viewerId: string,
    @Param('id') id: string,
  ): Promise<GetUserByIdResponse | PublicUserResponse> {
    const output = await this.getUserById.execute(id);
    return id === viewerId
      ? GetUserByIdPresenter.toHttp(output)
      : GetUserByIdPresenter.toPublic(output);
  }
}
