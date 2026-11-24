import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { CompareCompatibilityUseCase } from '../../../application/use-cases/compare-compatibility/compare-compatibility.use-case.js';
import { ListCompatibleStudentsUseCase } from '../../../application/use-cases/list-compatible-students/list-compatible-students.use-case.js';
import { ListCompatibleStudentsDto } from '../dtos/list-compatible-students.dto.js';

@Controller('matching')
@UseGuards(JwtAuthGuard)
export class CompatibilityController {
  constructor(
    private readonly compareCompatibility: CompareCompatibilityUseCase,
    private readonly listCompatibleStudents: ListCompatibleStudentsUseCase,
  ) {}

  // Estudantes ordenados do mais ao menos compatível com quem está logado.
  @Get('recommendations')
  recommendations(@CurrentUserId() viewerUserId: string, @Query() query: ListCompatibleStudentsDto) {
    return this.listCompatibleStudents.execute({
      viewerUserId,
      limit: query.limit,
      minScore: query.minScore,
    });
  }

  @Get('compatibility/:targetUserId')
  compare(
    @CurrentUserId() viewerUserId: string,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.compareCompatibility.execute({ viewerUserId, targetUserId });
  }
}
