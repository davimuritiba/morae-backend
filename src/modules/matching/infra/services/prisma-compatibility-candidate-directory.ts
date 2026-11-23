import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../../shared/infra/database/prisma-transaction-context.js';
import { isUuid } from '../../../../shared/infra/database/uuid.js';
import { StudentMapper } from '../../../user/infra/persistence/mappers/student.mapper.js';
import {
  CompatibilityCandidateDirectory,
  type CompatibilityCandidate,
} from '../../application/ports/compatibility-candidate-directory.port.js';

// Teto de segurança: o ranking é calculado em memória sobre esses candidatos.
const MAX_CANDIDATES = 500;

@Injectable()
export class PrismaCompatibilityCandidateDirectory extends CompatibilityCandidateDirectory {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findCandidates(excludeUserId: string): Promise<CompatibilityCandidate[]> {
    const rows = await this.db.client.student.findMany({
      where: {
        compatibilityAnswers: { isNot: null },
        user: {
          status: 'ACTIVE',
          emailVerified: true,
          ...(isUuid(excludeUserId) ? { id: { not: excludeUserId } } : {}),
        },
      },
      select: {
        course: true,
        period: true,
        compatibilityAnswers: true,
        user: { select: { id: true, name: true, photoUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: MAX_CANDIDATES,
    });

    return rows.flatMap((row) =>
      row.compatibilityAnswers
        ? [
            {
              userId: row.user.id,
              name: row.user.name,
              photoUrl: row.user.photoUrl,
              course: row.course,
              period: row.period,
              answers: StudentMapper.compatibilityAnswersToDomain(row.compatibilityAnswers),
            },
          ]
        : [],
    );
  }
}
