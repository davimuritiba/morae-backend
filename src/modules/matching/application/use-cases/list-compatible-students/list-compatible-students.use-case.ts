import type { StudentRepository } from '../../../../user/domain/repositories/student.repository.js';
import { CompatibilityAnswersRequiredError } from '../../../domain/errors/compatibility-answers-required.error.js';
import type {
  CompatibilityCalculator,
  CompatibilityLevel,
} from '../../../domain/services/compatibility-calculator.js';
import type { CompatibilityCandidateDirectory } from '../../ports/compatibility-candidate-directory.port.js';

export const DEFAULT_RECOMMENDATIONS_LIMIT = 6;
export const MAX_RECOMMENDATIONS_LIMIT = 20;

export interface ListCompatibleStudentsInput {
  viewerUserId: string;
  limit?: number;
  minScore?: number;
}

export interface CompatibleStudent {
  userId: string;
  name: string;
  photoUrl: string | null;
  course: string;
  period: number;
  score: number;
  level: CompatibilityLevel;
  summary: string;
  sharedTraits: string[];
  hasCriticalDifference: boolean;
}

export interface ListCompatibleStudentsOutput {
  items: CompatibleStudent[];
  total: number;
}

// Ranqueia os estudantes pela compatibilidade com quem está consultando.
export class ListCompatibleStudentsUseCase {
  constructor(
    private readonly students: StudentRepository,
    private readonly candidates: CompatibilityCandidateDirectory,
    private readonly calculator: CompatibilityCalculator,
  ) {}

  async execute(input: ListCompatibleStudentsInput): Promise<ListCompatibleStudentsOutput> {
    const viewer = await this.students.findByUserId(input.viewerUserId);
    const viewerAnswers = viewer?.compatibilityAnswers;
    if (!viewerAnswers) throw new CompatibilityAnswersRequiredError();

    const limit = Math.min(
      Math.max(input.limit ?? DEFAULT_RECOMMENDATIONS_LIMIT, 1),
      MAX_RECOMMENDATIONS_LIMIT,
    );
    const minScore = input.minScore ?? 0;

    const ranked = (await this.candidates.findCandidates(input.viewerUserId))
      .filter((candidate) => candidate.userId !== input.viewerUserId)
      .map((candidate): CompatibleStudent => {
        const result = this.calculator.calculate(viewerAnswers, candidate.answers);
        return {
          userId: candidate.userId,
          name: candidate.name,
          photoUrl: candidate.photoUrl,
          course: candidate.course,
          period: candidate.period,
          score: result.score,
          level: result.level,
          summary: result.summary,
          sharedTraits: this.calculator.sharedTraits(viewerAnswers, candidate.answers),
          hasCriticalDifference: result.differences.some((point) => point.critical),
        };
      })
      .filter((item) => item.score >= minScore)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'pt-BR'));

    return { items: ranked.slice(0, limit), total: ranked.length };
  }
}
