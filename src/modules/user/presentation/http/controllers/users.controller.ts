import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { GetUserByIdUseCase } from '../../../application/use-cases/get-user-by-id/get-user-by-id.use-case.js';
import { GetUserProfileUseCase } from '../../../application/use-cases/get-user-profile/get-user-profile.use-case.js';
import type { UserProfileView } from '../../../application/use-cases/get-user-profile/get-user-profile.output.js';
import { UpdateMyProfileUseCase } from '../../../application/use-cases/update-my-profile/update-my-profile.use-case.js';
import { UpdateUserProfileUseCase } from '../../../application/use-cases/update-user-profile/update-user-profile.use-case.js';
import { profileDetailsInput } from '../dtos/profile-details.dto.js';
import { UpdateMyProfileDto } from '../dtos/update-my-profile.dto.js';
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
    private readonly getUserProfile: GetUserProfileUseCase,
    private readonly updateMyProfile: UpdateMyProfileUseCase,
  ) {}

  // Rotas de /me antes das de /:id, para "me" não ser lido como id.
  @Get('me/profile')
  myProfile(@CurrentUserId() viewerId: string): Promise<UserProfileView> {
    return this.getUserProfile.execute({ viewerId, targetUserId: viewerId });
  }

  @Patch('me/profile')
  updateMyProfileDetails(
    @CurrentUserId() userId: string,
    @Body() dto: UpdateMyProfileDto,
  ): Promise<UserProfileView> {
    return this.updateMyProfile.execute({
      userId,
      details: profileDetailsInput(dto.details),
      course: dto.course,
      period: dto.period,
      compatibilityAnswers: dto.compatibilityAnswers,
    });
  }

  @Get(':id/profile')
  profile(
    @CurrentUserId() viewerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserProfileView> {
    return this.getUserProfile.execute({ viewerId, targetUserId: id });
  }

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
