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
import { ConfirmEmailVerificationUseCase } from '../../../application/use-cases/confirm-email-verification/confirm-email-verification.use-case.js';
import { ResendEmailVerificationUseCase } from '../../../application/use-cases/resend-email-verification/resend-email-verification.use-case.js';
import { ConfirmEmailVerificationDto } from '../dtos/confirm-email-verification.dto.js';
import { ResendEmailVerificationDto } from '../dtos/resend-email-verification.dto.js';

const MINUTE_MS = 60 * 1000;

// Rotas chamadas pela página /verificar-email do front-end. Os limites por IP
// dificultam adivinhar tokens e usar o reenvio para disparar e-mails em massa.
@Controller('email-verification')
@UseGuards(ThrottlerGuard)
export class EmailVerificationController {
  readonly #logger = new Logger(EmailVerificationController.name);

  constructor(
    private readonly confirmEmailVerification: ConfirmEmailVerificationUseCase,
    private readonly resendEmailVerification: ResendEmailVerificationUseCase,
  ) {}

  // POST /email-verification/confirm → 204, ou 422 se o token for inválido.
  @Post('confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: MINUTE_MS } })
  async confirm(@Body() dto: ConfirmEmailVerificationDto): Promise<void> {
    await this.confirmEmailVerification.execute({ token: dto.token });
  }

  // POST /email-verification/resend → sempre 202.
  @Post('resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 3, ttl: 15 * MINUTE_MS } })
  resend(@Body() dto: ResendEmailVerificationDto): void {
    // Responde na hora e envia em segundo plano: assim nem a resposta nem o
    // tempo dela revelam se o e-mail tem conta. Erros de domínio (ex.: e-mail
    // em formato inválido) só significam que não há nada a enviar.
    this.resendEmailVerification
      .execute({ email: dto.email })
      .catch((error: unknown) => {
        if (!(error instanceof DomainError)) {
          this.#logger.error(
            'Falha ao reenviar o e-mail de verificação.',
            error instanceof Error ? error.stack : String(error),
          );
        }
      });
  }
}
