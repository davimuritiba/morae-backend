import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CheckRegistrationAvailabilityUseCase } from '../../../application/use-cases/check-registration-availability/check-registration-availability.use-case.js';
import type { CheckRegistrationAvailabilityOutput } from '../../../application/use-cases/check-registration-availability/check-registration-availability.output.js';
import { CheckRegistrationAvailabilityDto } from '../dtos/check-registration-availability.dto.js';

const MINUTE_MS = 60 * 1000;

@Controller('registration')
@UseGuards(ThrottlerGuard)
export class RegistrationAvailabilityController {
  constructor(
    private readonly checkRegistrationAvailability: CheckRegistrationAvailabilityUseCase,
  ) {}

  @Post('availability')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: MINUTE_MS } })
  check(
    @Body() dto: CheckRegistrationAvailabilityDto,
  ): Promise<CheckRegistrationAvailabilityOutput> {
    const input = {
      cpf: dto.cpf ?? undefined,
      email: dto.email ?? undefined,
      enrollmentNumber: dto.enrollmentNumber ?? undefined,
    };
    if (Object.values(input).every((value) => value === undefined)) {
      throw new BadRequestException(
        'Informe ao menos um campo: cpf, email ou enrollmentNumber.',
      );
    }

    return this.checkRegistrationAvailability.execute(input);
  }
}
