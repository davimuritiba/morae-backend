import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { CreateReportUseCase } from '../../../application/use-cases/create-report/create-report.use-case.js';
import { CreateReportDto } from '../dto/create-report.dto.js';

@Controller('reports')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class ReportsController {
  constructor(private readonly createReport: CreateReportUseCase) {}

  @Post()
  async create(@CurrentUserId() reporterId: string, @Body() input: CreateReportDto) {
    const report = await this.createReport.execute({
      reporterId,
      targetUserId: input.targetUserId,
      listingId: input.listingId,
      category: input.category,
      description: input.description,
    });
    return { id: report.id, status: report.status, createdAt: report.createdAt };
  }
}
