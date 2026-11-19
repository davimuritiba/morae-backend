import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthTokenService } from '../../../../../shared/infra/auth/auth-token.service.js';
import { LoginAdministratorUseCase } from '../../../application/use-cases/login-administrator/login-administrator.use-case.js';
import { LoginUseCase } from '../../../application/use-cases/login/login.use-case.js';
import { LoginAdministratorDto } from '../dtos/login-administrator.dto.js';
import { LoginDto } from '../dtos/login.dto.js';
import { LoginThrottlerGuard } from '../guards/login-throttler.guard.js';
import {
  LoginAdministratorPresenter,
  type LoginAdministratorResponse,
} from '../presenters/login-administrator.presenter.js';
import {
  LoginPresenter,
  type LoginResponse,
} from '../presenters/login.presenter.js';

const LOGIN_ATTEMPTS = { default: { limit: 10, ttl: 15 * 60 * 1000 } };

@Controller('auth')
@UseGuards(LoginThrottlerGuard)
@Throttle(LOGIN_ATTEMPTS)
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly tokens: AuthTokenService,
    private readonly loginAdminUseCase: LoginAdministratorUseCase,
  ) {}

  @Post('login')
  async loginUser(@Body() dto: LoginDto): Promise<LoginResponse> {
    const output = await this.login.execute({
      email: dto.email,
      password: dto.password,
    });
    const accessToken = await this.tokens.sign(output.userId);

    return LoginPresenter.toHttp(output, accessToken);
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
