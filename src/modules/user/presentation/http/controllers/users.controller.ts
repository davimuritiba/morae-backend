import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { GetUserByIdUseCase } from '../../../application/use-cases/get-user-by-id/get-user-by-id.use-case.js';
import { UpdateUserProfileUseCase } from '../../../application/use-cases/update-user-profile/update-user-profile.use-case.js';
import { UpdateUserProfileDto } from '../dtos/update-user-profile.dto.js';
import {
  GetUserByIdPresenter,
  type GetUserByIdResponse,
} from '../presenters/get-user-by-id.presenter.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly getUserById: GetUserByIdUseCase,
    private readonly updateUserProfile: UpdateUserProfileUseCase,
  ) {}

  @Get(':id')
  async getById(@Param('id') id: string): Promise<GetUserByIdResponse> {
    const output = await this.getUserById.execute(id);
    return GetUserByIdPresenter.toHttp(output);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
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
