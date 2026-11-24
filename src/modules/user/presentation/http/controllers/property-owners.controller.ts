import { profileDetailsInput } from '../dtos/profile-details.dto.js';
import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RegisterPropertyOwnerUseCase } from '../../../application/use-cases/register-property-owner/register-property-owner.use-case.js';
import { RegisterPropertyOwnerDto } from '../dtos/register-property-owner.dto.js';
import {
  RegisterPropertyOwnerPresenter,
  type RegisterPropertyOwnerResponse,
} from '../presenters/register-property-owner.presenter.js';

@Controller('property-owners')
export class PropertyOwnersController {
  constructor(private readonly registerOwner: RegisterPropertyOwnerUseCase) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async register(
    @Body() dto: RegisterPropertyOwnerDto,
  ): Promise<RegisterPropertyOwnerResponse> {
    const output = await this.registerOwner.execute({
      name: dto.name,
      email: dto.email,
      cpf: dto.cpf,
      password: dto.password,
      phone: dto.phone ?? null,
      profileDetails: profileDetailsInput(dto.profileDetails),
    });
    return RegisterPropertyOwnerPresenter.toHttp(output);
  }
}
