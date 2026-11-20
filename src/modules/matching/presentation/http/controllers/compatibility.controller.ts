import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { CompareCompatibilityUseCase } from '../../../application/use-cases/compare-compatibility/compare-compatibility.use-case.js';

@Controller('matching')
@UseGuards(JwtAuthGuard)
export class CompatibilityController {
  constructor(private readonly compareCompatibility: CompareCompatibilityUseCase) {}

  @Get('compatibility/:targetUserId')
  compare(
    @CurrentUserId() viewerUserId: string,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.compareCompatibility.execute({ viewerUserId, targetUserId });
  }
}
