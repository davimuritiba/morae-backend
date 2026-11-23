import { describe, expect, it } from 'vitest';
import type { Student } from '../../../user/domain/entities/student.entity.js';
import type { StudentCompatibilityAnswers } from '../../../user/domain/entities/student-compatibility-answers.entity.js';
import { SmokingFrequency, SleepTime } from '../../../user/domain/enums/student-compatibility.enum.js';
import { StudentRepository } from '../../../user/domain/repositories/student.repository.js';
import {
  CompatibilityCandidateDirectory,
  type CompatibilityCandidate,
} from '../../application/ports/compatibility-candidate-directory.port.js';
import { ListCompatibleStudentsUseCase } from '../../application/use-cases/list-compatible-students/list-compatible-students.use-case.js';
import { CompatibilityAnswersRequiredError } from '../../domain/errors/compatibility-answers-required.error.js';
import { CompatibilityCalculator } from '../../domain/services/compatibility-calculator.js';
import { makeAnswers } from '../fixtures.js';

const VIEWER_ID = '11111111-1111-4111-8111-111111111111';

class FakeStudentRepository extends StudentRepository {
  constructor(private readonly answersByUser: Map<string, StudentCompatibilityAnswers | null>) {
    super();
  }
  async findById(): Promise<Student | null> {
    return null;
  }
  async findByUserId(userId: string): Promise<Student | null> {
    if (!this.answersByUser.has(userId)) return null;
    return { compatibilityAnswers: this.answersByUser.get(userId) ?? null } as unknown as Student;
  }
  async existsByEnrollmentNumber(): Promise<boolean> {
    return false;
  }
  async save(): Promise<void> {}
}

class FakeCandidateDirectory extends CompatibilityCandidateDirectory {
  lastExcluded: string | null = null;
  constructor(private readonly candidates: CompatibilityCandidate[]) {
    super();
  }
  async findCandidates(excludeUserId: string): Promise<CompatibilityCandidate[]> {
    this.lastExcluded = excludeUserId;
    return this.candidates;
  }
}

function candidate(userId: string, name: string, answers = makeAnswers()): CompatibilityCandidate {
  return { userId, name, photoUrl: null, course: 'Medicina', period: 3, answers };
}

function makeUseCase(viewerAnswers: StudentCompatibilityAnswers | null, candidates: CompatibilityCandidate[]) {
  const directory = new FakeCandidateDirectory(candidates);
  const useCase = new ListCompatibleStudentsUseCase(
    new FakeStudentRepository(new Map([[VIEWER_ID, viewerAnswers]])),
    directory,
    new CompatibilityCalculator(),
  );
  return { useCase, directory };
}

describe('ListCompatibleStudentsUseCase', () => {
  it('ordena os estudantes do mais ao menos compatível', async () => {
    const { useCase, directory } = makeUseCase(makeAnswers(), [
      candidate('c', 'Carla', makeAnswers({ smoking: SmokingFrequency.YES })),
      candidate('a', 'Ana'),
      candidate('b', 'Bruno', makeAnswers({ sleepTime: SleepTime.AFTER_01 })),
    ]);

    const result = await useCase.execute({ viewerUserId: VIEWER_ID });

    expect(directory.lastExcluded).toBe(VIEWER_ID);
    expect(result.items.map((item) => item.name)).toEqual(['Ana', 'Bruno', 'Carla']);
    expect(result.items[0]).toMatchObject({ score: 100, level: 'HIGH', hasCriticalDifference: false });
    expect(result.items[2].hasCriticalDifference).toBe(true);
    expect(result.total).toBe(3);
  });

  it('desempata pelo nome e respeita o limite', async () => {
    const { useCase } = makeUseCase(makeAnswers(), [
      candidate('z', 'Zuleica'),
      candidate('b', 'Beatriz'),
      candidate('m', 'Mateus'),
    ]);

    const result = await useCase.execute({ viewerUserId: VIEWER_ID, limit: 2 });

    expect(result.items.map((item) => item.name)).toEqual(['Beatriz', 'Mateus']);
    expect(result.total).toBe(3);
  });

  it('filtra pelo índice mínimo', async () => {
    const { useCase } = makeUseCase(makeAnswers(), [
      candidate('a', 'Ana'),
      candidate('c', 'Carla', makeAnswers({ smoking: SmokingFrequency.YES })),
    ]);

    const result = await useCase.execute({ viewerUserId: VIEWER_ID, minScore: 60 });

    expect(result.items.map((item) => item.name)).toEqual(['Ana']);
  });

  it('nunca sugere a própria pessoa', async () => {
    const { useCase } = makeUseCase(makeAnswers(), [candidate(VIEWER_ID, 'Eu'), candidate('a', 'Ana')]);

    const result = await useCase.execute({ viewerUserId: VIEWER_ID });

    expect(result.items.map((item) => item.userId)).toEqual(['a']);
  });

  it('exige que quem consulta tenha respondido o questionário', async () => {
    const { useCase } = makeUseCase(null, [candidate('a', 'Ana')]);

    await expect(useCase.execute({ viewerUserId: VIEWER_ID })).rejects.toBeInstanceOf(
      CompatibilityAnswersRequiredError,
    );
  });
});
