import { Body, Controller, Post } from '@nestjs/common';
import { AuthTokenService } from '../../../../../shared/infra/auth/auth-token.service.js';
import { LoginUseCase } from '../../../application/use-cases/login/login.use-case.js';
import { LoginDto } from '../dtos/login.dto.js';
import {
  LoginPresenter,
  type LoginResponse,
} from '../presenters/login.presenter.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly login: LoginUseCase,
    private readonly tokens: AuthTokenService,
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
}
