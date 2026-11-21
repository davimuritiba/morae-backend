import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthTokenService } from '../../../../../shared/infra/auth/auth-token.service.js';
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
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
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
    const accessToken = await this.tokens.signAdministrator(
      output.userId,
      output.administratorId,
      output.permissions,
    );
    return LoginAdministratorPresenter.toHttp(output, accessToken);
  }
}
