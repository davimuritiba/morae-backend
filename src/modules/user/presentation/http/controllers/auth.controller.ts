import { Body, Controller, Post } from '@nestjs/common';
import { LoginUseCase } from '../../../application/use-cases/login/login.use-case.js';
import { LoginDto } from '../dtos/login.dto.js';
import { LoginAdministratorDto } from '../dtos/login-administrator.dto.js';
import { LoginAdministratorUseCase } from '../../../application/use-cases/login-administrator/login-administrator.use-case.js';
import {
  LoginPresenter,
  type LoginResponse,
} from '../presenters/login.presenter.js';
import {
  LoginAdministratorPresenter,
  type LoginAdministratorResponse,
} from '../presenters/login-administrator.presenter.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly loginAdminUseCase: LoginAdministratorUseCase,
  ) {}

  @Post('login')
  async loginUser(@Body() dto: LoginDto): Promise<LoginResponse> {
    const output = await this.login.execute({
      email: dto.email,
      password: dto.password,
    });

    return LoginPresenter.toHttp(output);
  }

  @Post('admin/login')
  async loginAdministrator(
    @Body() dto: LoginAdministratorDto,
  ): Promise<LoginAdministratorResponse> {
    const output = await this.loginAdminUseCase.execute({
      login: dto.login,
      password: dto.password,
    });
    return LoginAdministratorPresenter.toHttp(output);
  }
}
