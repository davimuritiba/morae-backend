import type { StudentRepository } from '../../../../user/domain/repositories/student.repository.js';
import type { UserRepository } from '../../../../user/domain/repositories/user.repository.js';
import { CompatibilityProfileNotFoundError } from '../../../domain/errors/compatibility-profile-not-found.error.js';
import type {
  CompatibilityCalculation,
  CompatibilityCalculator,
} from '../../../domain/services/compatibility-calculator.js';

export interface CompareCompatibilityInput { viewerUserId: string; targetUserId: string; }
export interface CompareCompatibilityOutput extends CompatibilityCalculation {
  viewer: { userId: string; name: string };
  target: { userId: string; name: string };
}

export class CompareCompatibilityUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly students: StudentRepository,
    private readonly calculator: CompatibilityCalculator,
  ) {}

  async execute(input: CompareCompatibilityInput): Promise<CompareCompatibilityOutput> {
    if (input.viewerUserId === input.targetUserId) throw new CompatibilityProfileNotFoundError();
    const [viewerUser, targetUser, viewerStudent, targetStudent] = await Promise.all([
      this.users.findById(input.viewerUserId),
      this.users.findById(input.targetUserId),
      this.students.findByUserId(input.viewerUserId),
      this.students.findByUserId(input.targetUserId),
    ]);
    const viewerAnswers = viewerStudent?.compatibilityAnswers;
    const targetAnswers = targetStudent?.compatibilityAnswers;
    if (!viewerUser || !targetUser || !viewerAnswers || !targetAnswers) {
      throw new CompatibilityProfileNotFoundError();
    }
    return {
      viewer: { userId: viewerUser.id, name: viewerUser.name },
      target: { userId: targetUser.id, name: targetUser.name },
      ...this.calculator.calculate(viewerAnswers, targetAnswers),
    };
  }
}
