import { Module } from '@nestjs/common';
import { UnitOfWork } from '../../shared/application/unit-of-work.js';
import { Hasher } from './application/ports/hasher.port.js';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id/get-user-by-id.use-case.js';
import { LoginUseCase } from './application/use-cases/login/login.use-case.js';
import { RegisterStudentUseCase } from './application/use-cases/register-student/register-student.use-case.js';
import { StudentRepository } from './domain/repositories/student.repository.js';
import { UserRepository } from './domain/repositories/user.repository.js';
import { PrismaStudentRepository } from './infra/persistence/repositories/prisma-student.repository.js';
import { PrismaUserRepository } from './infra/persistence/repositories/prisma-user.repository.js';
import { Argon2Hasher } from './infra/services/argon2-hasher.js';
import { AuthController } from './presentation/http/controllers/auth.controller.js';
import { StudentsController } from './presentation/http/controllers/students.controller.js';
import { UsersController } from './presentation/http/controllers/users.controller.js';

// Composition root do contexto user: é o único lugar que liga os contratos
// (domínio e aplicação) às implementações da infra.
@Module({
  controllers: [AuthController, StudentsController, UsersController],
  providers: [
    // Contratos → implementações. As classes abstratas servem de token.
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: StudentRepository, useClass: PrismaStudentRepository },
    { provide: Hasher, useClass: Argon2Hasher },

    // Casos de uso não têm decorators do Nest (a camada de aplicação não o
    // conhece), então são montados por factory. UnitOfWork vem do
    // DatabaseModule, que é global.
    {
      provide: RegisterStudentUseCase,
      useFactory: (
        users: UserRepository,
        students: StudentRepository,
        hasher: Hasher,
        unitOfWork: UnitOfWork,
      ) => new RegisterStudentUseCase(users, students, hasher, unitOfWork),
      inject: [UserRepository, StudentRepository, Hasher, UnitOfWork],
    },
    {
      provide: LoginUseCase,
      useFactory: (users: UserRepository, hasher: Hasher) =>
        new LoginUseCase(users, hasher),
      inject: [UserRepository, Hasher],
    },
    {
      provide: GetUserByIdUseCase,
      useFactory: (users: UserRepository) => new GetUserByIdUseCase(users),
      inject: [UserRepository],
    },
  ],
})
export class UserModule {}
