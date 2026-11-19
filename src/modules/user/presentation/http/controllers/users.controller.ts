import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { GetUserByIdUseCase } from '../../../application/use-cases/get-user-by-id/get-user-by-id.use-case.js';
import { UpdateUserProfileUseCase } from '../../../application/use-cases/update-user-profile/update-user-profile.use-case.js';
import { UpdateUserProfileDto } from '../dtos/update-user-profile.dto.js';
import {
  GetUserByIdPresenter,
  type GetUserByIdResponse,
  type PublicUserResponse,
} from '../presenters/get-user-by-id.presenter.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly getUserById: GetUserByIdUseCase,
    private readonly updateUserProfile: UpdateUserProfileUseCase,
  ) {}

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

  @Patch('me')
  async updateMe(
    @CurrentUserId() userId: string,
    @Body() dto: UpdateUserProfileDto,
  ): Promise<GetUserByIdResponse> {
    const output = await this.updateUserProfile.execute({
      userId,
      name: dto.name,
      email: dto.email,
      cpf: dto.cpf,
      phone: dto.phone,
    });
    return GetUserByIdPresenter.toHttp(output);
  }
}
