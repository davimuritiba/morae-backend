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
import { PasswordResetNotifier } from './application/ports/password-reset-notifier.port.js';
import { VerificationTokenGenerator } from './application/ports/verification-token-generator.port.js';
import { ConfirmEmailVerificationUseCase } from './application/use-cases/confirm-email-verification/confirm-email-verification.use-case.js';
import { GetUserByIdUseCase } from './application/use-cases/get-user-by-id/get-user-by-id.use-case.js';
import { GetUserProfileUseCase } from './application/use-cases/get-user-profile/get-user-profile.use-case.js';
import { UpdateMyProfileUseCase } from './application/use-cases/update-my-profile/update-my-profile.use-case.js';
import { UserProfileDetailsRepository } from './domain/repositories/user-profile-details.repository.js';
import { PrismaUserProfileDetailsRepository } from './infra/persistence/repositories/prisma-user-profile-details.repository.js';
import { UpdateUserProfileUseCase } from './application/use-cases/update-user-profile/update-user-profile.use-case.js';
import { ChangeUserPhotoUseCase } from './application/use-cases/change-user-photo/change-user-photo.use-case.js';
import { UserPhotoStorage } from './application/ports/user-photo-storage.port.js';
import { LocalUserPhotoStorage } from './infra/services/local-user-photo-storage.js';
import { LoginUseCase } from './application/use-cases/login/login.use-case.js';
import { LoginAdministratorUseCase } from './application/use-cases/login-administrator/login-administrator.use-case.js';
import { RequestPasswordResetUseCase } from './application/use-cases/request-password-reset/request-password-reset.use-case.js';
import { ResetPasswordUseCase } from './application/use-cases/reset-password/reset-password.use-case.js';
import { ChangeUserAccountStatusUseCase } from './application/use-cases/change-user-account-status/change-user-account-status.use-case.js';
import { GetAdminUserUseCase } from './application/use-cases/get-admin-user/get-admin-user.use-case.js';
import { ListAdminUsersUseCase } from './application/use-cases/list-admin-users/list-admin-users.use-case.js';
import { RegisterStudentUseCase } from './application/use-cases/register-student/register-student.use-case.js';
import { RegisterPropertyOwnerUseCase } from './application/use-cases/register-property-owner/register-property-owner.use-case.js';
import { ResendEmailVerificationUseCase } from './application/use-cases/resend-email-verification/resend-email-verification.use-case.js';
import { SendEmailVerificationUseCase } from './application/use-cases/send-email-verification/send-email-verification.use-case.js';
import { EmailVerificationTokenRepository } from './domain/repositories/email-verification-token.repository.js';
import { PasswordResetTokenRepository } from './domain/repositories/password-reset-token.repository.js';
import { StudentRepository } from './domain/repositories/student.repository.js';
import { PropertyOwnerRepository } from './domain/repositories/property-owner.repository.js';
import { UserRepository } from './domain/repositories/user.repository.js';
import { AccountTypeGuard } from '../../shared/presentation/guards/account-type.guard.js';
import { PrismaEmailVerificationTokenRepository } from './infra/persistence/repositories/prisma-email-verification-token.repository.js';
import { PrismaPasswordResetTokenRepository } from './infra/persistence/repositories/prisma-password-reset-token.repository.js';
import { AdministratorRepository } from './domain/repositories/administrator.repository.js';
import { PrismaStudentRepository } from './infra/persistence/repositories/prisma-student.repository.js';
import { PrismaPropertyOwnerRepository } from './infra/persistence/repositories/prisma-property-owner.repository.js';
import { PrismaUserRepository } from './infra/persistence/repositories/prisma-user.repository.js';
import { PrismaAdministratorRepository } from './infra/persistence/repositories/prisma-administrator.repository.js';
import { Argon2Hasher } from './infra/services/argon2-hasher.js';
import { CryptoVerificationTokenGenerator } from './infra/services/crypto-verification-token-generator.js';
import { GoogleOAuthService } from './infra/services/google-oauth.service.js';
import { MailEmailVerificationNotifier } from './infra/services/mail-email-verification-notifier.js';
import { MailPasswordResetNotifier } from './infra/services/mail-password-reset-notifier.js';
import { AuthController } from './presentation/http/controllers/auth.controller.js';
import { GoogleOAuthController } from './presentation/http/controllers/google-oauth.controller.js';
import { AdminUsersController } from './presentation/http/controllers/admin-users.controller.js';
import { EmailVerificationController } from './presentation/http/controllers/email-verification.controller.js';
import { PasswordResetController } from './presentation/http/controllers/password-reset.controller.js';
import { StudentsController } from './presentation/http/controllers/students.controller.js';
import { PropertyOwnersController } from './presentation/http/controllers/property-owners.controller.js';
import { UsersController } from './presentation/http/controllers/users.controller.js';
const HOUR_MS = 60 * 60 * 1000;

// Composition root do contexto user: é o único lugar que liga os contratos
// (domínio e aplicação) às implementações da infra. UnitOfWork vem do
// DatabaseModule e MailSender do MailModule, ambos globais.
@Module({
  controllers: [
    AuthController,
    GoogleOAuthController,
    AdminUsersController,
    StudentsController,
    PropertyOwnersController,
    UsersController,
    EmailVerificationController,
    PasswordResetController,
  ],
  exports: [UserRepository, StudentRepository, AccountTypeGuard],
  providers: [
    AccountTypeGuard,
    GoogleOAuthService,
    // Contratos → implementações. As classes abstratas servem de token.
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: StudentRepository, useClass: PrismaStudentRepository },
    {
      provide: UserProfileDetailsRepository,
      useClass: PrismaUserProfileDetailsRepository,
    },
    {
      provide: GetUserProfileUseCase,
      useFactory: (
        users: UserRepository,
        students: StudentRepository,
        details: UserProfileDetailsRepository,
      ) => new GetUserProfileUseCase(users, students, details),
      inject: [UserRepository, StudentRepository, UserProfileDetailsRepository],
    },
    {
      provide: UpdateMyProfileUseCase,
      useFactory: (
        users: UserRepository,
        students: StudentRepository,
        details: UserProfileDetailsRepository,
        unitOfWork: UnitOfWork,
        getUserProfile: GetUserProfileUseCase,
      ) => new UpdateMyProfileUseCase(users, students, details, unitOfWork, getUserProfile),
      inject: [
        UserRepository,
        StudentRepository,
        UserProfileDetailsRepository,
        UnitOfWork,
        GetUserProfileUseCase,
      ],
    },
    {
      provide: PropertyOwnerRepository,
      useClass: PrismaPropertyOwnerRepository,
    },
    {
      provide: EmailVerificationTokenRepository,
      useClass: PrismaEmailVerificationTokenRepository,
    },
    {
      provide: PasswordResetTokenRepository,
      useClass: PrismaPasswordResetTokenRepository,
    },
    {
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
    {
      provide: PasswordResetNotifier,
      useFactory: (mailer: MailSender) =>
        new MailPasswordResetNotifier(mailer, {
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
      provide: RequestPasswordResetUseCase,
      useFactory: (
        users: UserRepository,
        tokens: PasswordResetTokenRepository,
        tokenGenerator: VerificationTokenGenerator,
        notifier: PasswordResetNotifier,
        clock: Clock,
        unitOfWork: UnitOfWork,
      ) =>
        new RequestPasswordResetUseCase(
          users,
          tokens,
          tokenGenerator,
          notifier,
          clock,
          unitOfWork,
          {
            tokenTtlMs:
              envPositiveInt('PASSWORD_RESET_TTL_MINUTES', 30) * 60_000,
          },
        ),
      inject: [
        UserRepository,
        PasswordResetTokenRepository,
        VerificationTokenGenerator,
        PasswordResetNotifier,
        Clock,
        UnitOfWork,
      ],
    },
    {
      provide: ResetPasswordUseCase,
      useFactory: (
        users: UserRepository,
        tokens: PasswordResetTokenRepository,
        tokenGenerator: VerificationTokenGenerator,
        hasher: Hasher,
        clock: Clock,
        unitOfWork: UnitOfWork,
      ) =>
        new ResetPasswordUseCase(
          users,
          tokens,
          tokenGenerator,
          hasher,
          clock,
          unitOfWork,
        ),
      inject: [
        UserRepository,
        PasswordResetTokenRepository,
        VerificationTokenGenerator,
        Hasher,
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
        propertyOwners: PropertyOwnerRepository,
        hasher: Hasher,
        unitOfWork: UnitOfWork,
        sendEmailVerification: SendEmailVerificationUseCase,
        logger: Logger,
        profileDetails: UserProfileDetailsRepository,
      ) =>
        new RegisterStudentUseCase(
          users,
          students,
          propertyOwners,
          hasher,
          unitOfWork,
          sendEmailVerification,
          logger,
          profileDetails,
        ),
      inject: [
        UserRepository,
        StudentRepository,
        PropertyOwnerRepository,
        Hasher,
        UnitOfWork,
        SendEmailVerificationUseCase,
        Logger,
        UserProfileDetailsRepository,
      ],
    },
    {
      provide: RegisterPropertyOwnerUseCase,
      useFactory: (
        users: UserRepository,
        propertyOwners: PropertyOwnerRepository,
        hasher: Hasher,
        unitOfWork: UnitOfWork,
        sendEmailVerification: SendEmailVerificationUseCase,
        logger: Logger,
        profileDetails: UserProfileDetailsRepository,
      ) =>
        new RegisterPropertyOwnerUseCase(
          users,
          propertyOwners,
          hasher,
          unitOfWork,
          sendEmailVerification,
          logger,
          profileDetails,
        ),
      inject: [
        UserRepository,
        PropertyOwnerRepository,
        Hasher,
        UnitOfWork,
        SendEmailVerificationUseCase,
        Logger,
        UserProfileDetailsRepository,
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
      provide: UpdateUserProfileUseCase,
      useFactory: (
        users: UserRepository,
        sendEmailVerification: SendEmailVerificationUseCase,
        logger: Logger,
      ) => new UpdateUserProfileUseCase(users, sendEmailVerification, logger),
      inject: [UserRepository, SendEmailVerificationUseCase, Logger],
    },
    { provide: UserPhotoStorage, useClass: LocalUserPhotoStorage },
    {
      provide: ChangeUserPhotoUseCase,
      useFactory: (users: UserRepository, storage: UserPhotoStorage, logger: Logger) =>
        new ChangeUserPhotoUseCase(users, storage, logger),
      inject: [UserRepository, UserPhotoStorage, Logger],
    },
    {
      provide: ListAdminUsersUseCase,
      useFactory: (users: UserRepository) => new ListAdminUsersUseCase(users),
      inject: [UserRepository],
    },
    {
      provide: GetAdminUserUseCase,
      useFactory: (users: UserRepository) => new GetAdminUserUseCase(users),
      inject: [UserRepository],
    },
    {
      provide: ChangeUserAccountStatusUseCase,
      useFactory: (users: UserRepository) =>
        new ChangeUserAccountStatusUseCase(users),
      inject: [UserRepository],
    },
    {
      provide: LoginAdministratorUseCase,
      useFactory: (
        administrators: AdministratorRepository,
        users: UserRepository,
        hasher: Hasher,
      ) => new LoginAdministratorUseCase(administrators, users, hasher),
      inject: [AdministratorRepository, UserRepository, Hasher],
    },
  ],
})
export class UserModule {}
