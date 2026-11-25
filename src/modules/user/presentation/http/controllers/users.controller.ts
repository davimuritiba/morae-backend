import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_IMAGE_BYTES } from '../../../../../shared/infra/media/public-image-directory.js';
import { ChangeUserPhotoUseCase } from '../../../application/use-cases/change-user-photo/change-user-photo.use-case.js';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { GetUserByIdUseCase } from '../../../application/use-cases/get-user-by-id/get-user-by-id.use-case.js';
import { GetUserProfileUseCase } from '../../../application/use-cases/get-user-profile/get-user-profile.use-case.js';
import type { UserProfileView } from '../../../application/use-cases/get-user-profile/get-user-profile.output.js';
import { UpdateMyProfileUseCase } from '../../../application/use-cases/update-my-profile/update-my-profile.use-case.js';
import { UpdateUserProfileUseCase } from '../../../application/use-cases/update-user-profile/update-user-profile.use-case.js';
import { StudentRepository } from '../../../domain/repositories/student.repository.js';
import { PropertyOwnerRepository } from '../../../domain/repositories/property-owner.repository.js';
import type { UpdateUserProfileOutput } from '../../../application/use-cases/update-user-profile/update-user-profile.output.js';
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
    private readonly students: StudentRepository,
    private readonly propertyOwners: PropertyOwnerRepository,
    private readonly getUserProfile: GetUserProfileUseCase,
    private readonly updateMyProfile: UpdateMyProfileUseCase,
    private readonly changeUserPhoto: ChangeUserPhotoUseCase,
  ) {}

  // Envia a foto de perfil (multipart, campo "photo"): JPEG, PNG ou WEBP de
  // até 5 MB. Substitui a foto anterior.
  @Put('me/photo')
  @UseInterceptors(
    FileInterceptor('photo', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }),
  )
  async uploadMyPhoto(
    @CurrentUserId() userId: string,
    @UploadedFile() photo: Express.Multer.File | undefined,
  ): Promise<UpdateUserProfileOutput> {
    if (!photo) {
      throw new BadRequestException('Envie a foto no campo "photo".');
    }
    return this.changeUserPhoto.execute({ userId, file: photo });
  }

  @Delete('me/photo')
  async removeMyPhoto(
    @CurrentUserId() userId: string,
  ): Promise<UpdateUserProfileOutput> {
    return this.changeUserPhoto.execute({ userId, file: null });
  }

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
  async me(
    @CurrentUserId() viewerId: string,
  ): Promise<GetUserByIdResponse & { role: string }> {
    const [output, student, owner] = await Promise.all([
      this.getUserById.execute(viewerId),
      this.students.findByUserId(viewerId),
      this.propertyOwners.findByUserId(viewerId),
    ]);
    const role = student ? (owner ? 'ofertante' : 'estudante') : 'proprietario';

    return { ...GetUserByIdPresenter.toHttp(output), role };
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
  ): Promise<UpdateUserProfileOutput> {
    return this.updateUserProfile.execute({
      userId,
      name: dto.name,
      email: dto.email,
      cpf: dto.cpf,
      phone: dto.phone,
    });
  }
}
