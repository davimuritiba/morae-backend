import { Module } from '@nestjs/common';
import { StudentRepository } from '../user/domain/repositories/student.repository.js';
import { UserRepository } from '../user/domain/repositories/user.repository.js';
import { UserModule } from '../user/user.module.js';
import { CompareCompatibilityUseCase } from './application/use-cases/compare-compatibility/compare-compatibility.use-case.js';
import { CompatibilityCalculator } from './domain/services/compatibility-calculator.js';
import { CompatibilityController } from './presentation/http/controllers/compatibility.controller.js';

@Module({
  imports: [UserModule],
  controllers: [CompatibilityController],
  providers: [
    CompatibilityCalculator,
    {
      provide: CompareCompatibilityUseCase,
      useFactory: (users: UserRepository, students: StudentRepository, calculator: CompatibilityCalculator) =>
        new CompareCompatibilityUseCase(users, students, calculator),
      inject: [UserRepository, StudentRepository, CompatibilityCalculator],
    },
  ],
})
export class MatchingModule {}
