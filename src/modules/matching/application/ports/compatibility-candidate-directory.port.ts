import type { StudentCompatibilityAnswers } from '../../../user/domain/entities/student-compatibility-answers.entity.js';

export interface CompatibilityCandidate {
  userId: string;
  name: string;
  photoUrl: string | null;
  course: string;
  period: number;
  answers: StudentCompatibilityAnswers;
}

// Estudantes que podem aparecer como sugestão de convivência: conta ativa,
// e-mail verificado e respostas de convivência preenchidas.
export abstract class CompatibilityCandidateDirectory {
  abstract findCandidates(excludeUserId: string): Promise<CompatibilityCandidate[]>;
}
