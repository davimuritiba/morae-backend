import { Module } from '@nestjs/common';
import { StudentRepository } from '../user/domain/repositories/student.repository.js';
import { UserRepository } from '../user/domain/repositories/user.repository.js';
import { UserModule } from '../user/user.module.js';
import { CompatibilityCandidateDirectory } from './application/ports/compatibility-candidate-directory.port.js';
import { CompareCompatibilityUseCase } from './application/use-cases/compare-compatibility/compare-compatibility.use-case.js';
import { ListCompatibleStudentsUseCase } from './application/use-cases/list-compatible-students/list-compatible-students.use-case.js';
import { CompatibilityCalculator } from './domain/services/compatibility-calculator.js';
import { PrismaCompatibilityCandidateDirectory } from './infra/services/prisma-compatibility-candidate-directory.js';
import { CompatibilityController } from './presentation/http/controllers/compatibility.controller.js';

@Module({
  imports: [UserModule],
  controllers: [CompatibilityController],
  providers: [
    CompatibilityCalculator,
    {
      provide: CompatibilityCandidateDirectory,
      useClass: PrismaCompatibilityCandidateDirectory,
    },
    {
      provide: CompareCompatibilityUseCase,
      useFactory: (users: UserRepository, students: StudentRepository, calculator: CompatibilityCalculator) =>
        new CompareCompatibilityUseCase(users, students, calculator),
      inject: [UserRepository, StudentRepository, CompatibilityCalculator],
    },
    {
      provide: ListCompatibleStudentsUseCase,
      useFactory: (
        students: StudentRepository,
        candidates: CompatibilityCandidateDirectory,
        calculator: CompatibilityCalculator,
      ) => new ListCompatibleStudentsUseCase(students, candidates, calculator),
      inject: [StudentRepository, CompatibilityCandidateDirectory, CompatibilityCalculator],
    },
  ],
})
export class MatchingModule {}
