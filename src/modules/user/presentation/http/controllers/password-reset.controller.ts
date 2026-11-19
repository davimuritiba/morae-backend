import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { DomainError } from '../../../../../shared/domain/errors/domain-error.js';
import { RequestPasswordResetUseCase } from '../../../application/use-cases/request-password-reset/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from '../../../application/use-cases/reset-password/reset-password.use-case.js';
import { RequestPasswordResetDto } from '../dtos/request-password-reset.dto.js';
import { ResetPasswordDto } from '../dtos/reset-password.dto.js';

const MINUTE_MS = 60 * 1000;

@Controller('auth/password-reset')
@UseGuards(ThrottlerGuard)
export class PasswordResetController {
  readonly #logger = new Logger(PasswordResetController.name);

  constructor(
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
  ) {}

  @Post('request')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 15 * MINUTE_MS } })
  request(@Body() dto: RequestPasswordResetDto): void {
    this.requestPasswordReset
      .execute({ email: dto.email })
      .catch((error: unknown) => {
        if (!(error instanceof DomainError)) {
          this.#logger.error(
            'Falha ao solicitar redefinição de senha.',
            error instanceof Error ? error.stack : String(error),
          );
        }
      });
  }

  @Post('confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: MINUTE_MS } })
  async confirm(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.resetPassword.execute({
      token: dto.token,
      password: dto.password,
      passwordConfirmation: dto.passwordConfirmation,
    });
  }
}
