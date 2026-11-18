import { Module } from '@nestjs/common';
import { Clock } from '../../shared/application/clock.js';
import { Logger } from '../../shared/application/logger.js';
import { UnitOfWork } from '../../shared/application/unit-of-work.js';
import { envPositiveInt, requireEnv } from '../../shared/infra/config/env.js';
import { MailSender } from '../../shared/infra/mail/mail-sender.js';
import { NestLoggerAdapter } from '../../shared/infra/nest-logger.js';
import { SystemClock } from '../../shared/infra/system-clock.js';
import { EmailVerificationNotifier } from './application/ports/email-verification-notifier.port.js';
import { Hasher } from './application/ports/hasher.port.js';
import { VerificationTokenGenerator } from './application/ports/verification-token-generator.port.js';
import { ConfirmEmailVerificationUseCase } from './application/use-cases/confirm-email-verification/confirm-email-verification.use-case.js';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id/get-user-by-id.use-case.js';
import { LoginUseCase } from './application/use-cases/login/login.use-case.js';
import { LoginAdministratorUseCase } from './application/use-cases/login-administrator/login-administrator.use-case.js';
import { RegisterStudentUseCase } from './application/use-cases/register-student/register-student.use-case.js';
import { ResendEmailVerificationUseCase } from './application/use-cases/resend-email-verification/resend-email-verification.use-case.js';
import { SendEmailVerificationUseCase } from './application/use-cases/send-email-verification/send-email-verification.use-case.js';
import { EmailVerificationTokenRepository } from './domain/repositories/email-verification-token.repository.js';
import { StudentRepository } from './domain/repositories/student.repository.js';
import { UserRepository } from './domain/repositories/user.repository.js';
import { PrismaEmailVerificationTokenRepository } from './infra/persistence/repositories/prisma-email-verification-token.repository.js';
import { AdministratorRepository } from './domain/repositories/administrator.repository.js';
import { PrismaStudentRepository } from './infra/persistence/repositories/prisma-student.repository.js';
import { PrismaUserRepository } from './infra/persistence/repositories/prisma-user.repository.js';
import { PrismaAdministratorRepository } from './infra/persistence/repositories/prisma-administrator.repository.js';
import { Argon2Hasher } from './infra/services/argon2-hasher.js';
import { CryptoVerificationTokenGenerator } from './infra/services/crypto-verification-token-generator.js';
import { MailEmailVerificationNotifier } from './infra/services/mail-email-verification-notifier.js';
import { AuthController } from './presentation/http/controllers/auth.controller.js';
import { EmailVerificationController } from './presentation/http/controllers/email-verification.controller.js';
import { StudentsController } from './presentation/http/controllers/students.controller.js';
import { UsersController } from './presentation/http/controllers/users.controller.js';
const HOUR_MS = 60 * 60 * 1000;

// Composition root do contexto user: é o único lugar que liga os contratos
// (domínio e aplicação) às implementações da infra. UnitOfWork vem do
// DatabaseModule e MailSender do MailModule, ambos globais.
@Module({
  controllers: [
    AuthController,
    StudentsController,
    UsersController,
    EmailVerificationController,
  ],
  providers: [
    // Contratos → implementações. As classes abstratas servem de token.
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: StudentRepository, useClass: PrismaStudentRepository },
    {
      provide: EmailVerificationTokenRepository,
      useClass: PrismaEmailVerificationTokenRepository,
    },{
      provide: AdministratorRepository,
      useClass: PrismaAdministratorRepository,
    },
    { provide: Hasher, useClass: Argon2Hasher },
    {
      provide: VerificationTokenGenerator,
      useClass: CryptoVerificationTokenGenerator,
    },
    { provide: Clock, useClass: SystemClock },
    { provide: Logger, useFactory: () => new NestLoggerAdapter('UserModule') },
    {
      provide: EmailVerificationNotifier,
      useFactory: (mailer: MailSender) =>
        new MailEmailVerificationNotifier(mailer, {
          appWebUrl: requireEnv('APP_WEB_URL'),
        }),
      inject: [MailSender],
    },

    // Casos de uso não têm decorators do Nest (a camada de aplicação não o
    // conhece), então são montados por factory.
    {
      provide: SendEmailVerificationUseCase,
      useFactory: (
        users: UserRepository,
        tokens: EmailVerificationTokenRepository,
        tokenGenerator: VerificationTokenGenerator,
        notifier: EmailVerificationNotifier,
        clock: Clock,
        unitOfWork: UnitOfWork,
      ) =>
        new SendEmailVerificationUseCase(
          users,
          tokens,
          tokenGenerator,
          notifier,
          clock,
          unitOfWork,
          {
            tokenTtlMs:
              envPositiveInt('EMAIL_VERIFICATION_TTL_HOURS', 24) * HOUR_MS,
          },
        ),
      inject: [
        UserRepository,
        EmailVerificationTokenRepository,
        VerificationTokenGenerator,
        EmailVerificationNotifier,
        Clock,
        UnitOfWork,
      ],
    },
    {
      provide: ConfirmEmailVerificationUseCase,
      useFactory: (
        users: UserRepository,
        tokens: EmailVerificationTokenRepository,
        tokenGenerator: VerificationTokenGenerator,
        clock: Clock,
        unitOfWork: UnitOfWork,
      ) =>
        new ConfirmEmailVerificationUseCase(
          users,
          tokens,
          tokenGenerator,
          clock,
          unitOfWork,
        ),
      inject: [
        UserRepository,
        EmailVerificationTokenRepository,
        VerificationTokenGenerator,
        Clock,
        UnitOfWork,
      ],
    },
    {
      provide: ResendEmailVerificationUseCase,
      useFactory: (
        users: UserRepository,
        sendEmailVerification: SendEmailVerificationUseCase,
      ) => new ResendEmailVerificationUseCase(users, sendEmailVerification),
      inject: [UserRepository, SendEmailVerificationUseCase],
    },
    {
      provide: RegisterStudentUseCase,
      useFactory: (
        users: UserRepository,
        students: StudentRepository,
        hasher: Hasher,
        unitOfWork: UnitOfWork,
        sendEmailVerification: SendEmailVerificationUseCase,
        logger: Logger,
      ) =>
        new RegisterStudentUseCase(
          users,
          students,
          hasher,
          unitOfWork,
          sendEmailVerification,
          logger,
        ),
      inject: [
        UserRepository,
        StudentRepository,
        Hasher,
        UnitOfWork,
        SendEmailVerificationUseCase,
        Logger,
      ],
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
    {
      provide: LoginAdministratorUseCase,
      useFactory: (
        administrators: AdministratorRepository,
        users: UserRepository,
        hasher: Hasher,
      ) =>
        new LoginAdministratorUseCase(administrators, users, hasher),
      inject: [AdministratorRepository, UserRepository, Hasher],
    },
  ],
})
export class UserModule {}
