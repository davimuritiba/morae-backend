import { Controller, Get, Param } from '@nestjs/common';
import { GetUserByIdUseCase } from '../../../application/use-cases/get-user-by-id/get-user-by-id.use-case.js';
import {
  GetUserByIdPresenter,
  type GetUserByIdResponse,
} from '../presenters/get-user-by-id.presenter.js';

@Controller('users')
export class UsersController {
  constructor(private readonly getUserById: GetUserByIdUseCase) {}

  @Get(':id')
  async getById(@Param('id') id: string): Promise<GetUserByIdResponse> {
    const output = await this.getUserById.execute(id);
    return GetUserByIdPresenter.toHttp(output);
  }
}
