import { Test, type TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { resetDatabase } from '../../../../test/integration/reset-database.js';
import { Clock } from '../../../shared/application/clock.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.js';
import { AuthModule } from '../../../shared/infra/auth/auth.module.js';
import { DatabaseModule } from '../../../shared/infra/database/database.module.js';
import { PrismaUnitOfWork } from '../../../shared/infra/database/prisma-unit-of-work.js';
import { PrismaService } from '../../../shared/infra/database/prisma.service.js';
import { MailModule } from '../../../shared/infra/mail/mail.module.js';
import { SystemClock } from '../../../shared/infra/system-clock.js';
import { EmailVerificationNotifier } from '../application/ports/email-verification-notifier.port.js';
import { Hasher } from '../application/ports/hasher.port.js';
import { VerificationTokenGenerator } from '../application/ports/verification-token-generator.port.js';
import { ConfirmEmailVerificationUseCase } from '../application/use-cases/confirm-email-verification/confirm-email-verification.use-case.js';
import { RegisterStudentUseCase } from '../application/use-cases/register-student/register-student.use-case.js';
import { RegisterPropertyOwnerUseCase } from '../application/use-cases/register-property-owner/register-property-owner.use-case.js';
import { ResendEmailVerificationUseCase } from '../application/use-cases/resend-email-verification/resend-email-verification.use-case.js';
import { SendEmailVerificationUseCase } from '../application/use-cases/send-email-verification/send-email-verification.use-case.js';
import { EmailVerificationTokenRepository } from '../domain/repositories/email-verification-token.repository.js';
import { StudentRepository } from '../domain/repositories/student.repository.js';
import { PropertyOwnerRepository } from '../domain/repositories/property-owner.repository.js';
import { UserRepository } from '../domain/repositories/user.repository.js';
import { PrismaEmailVerificationTokenRepository } from '../infra/persistence/repositories/prisma-email-verification-token.repository.js';
import { PrismaStudentRepository } from '../infra/persistence/repositories/prisma-student.repository.js';
import { PrismaPropertyOwnerRepository } from '../infra/persistence/repositories/prisma-property-owner.repository.js';
import { PrismaUserRepository } from '../infra/persistence/repositories/prisma-user.repository.js';
import { Argon2Hasher } from '../infra/services/argon2-hasher.js';
import { CryptoVerificationTokenGenerator } from '../infra/services/crypto-verification-token-generator.js';
import { MailEmailVerificationNotifier } from '../infra/services/mail-email-verification-notifier.js';
import { UserModule } from '../user.module.js';

describe('UserModule (integração)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      // Os mesmos módulos globais que o AppModule fornece ao UserModule.
      imports: [
        DatabaseModule,
        MailModule,
        AuthModule,
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
        UserModule,
      ],
    }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it('liga cada contrato à implementação da infra', () => {
    expect(moduleRef.get(UserRepository)).toBeInstanceOf(PrismaUserRepository);
    expect(moduleRef.get(StudentRepository)).toBeInstanceOf(
      PrismaStudentRepository,
    );
    expect(moduleRef.get(PropertyOwnerRepository)).toBeInstanceOf(
      PrismaPropertyOwnerRepository,
    );
    expect(moduleRef.get(Hasher)).toBeInstanceOf(Argon2Hasher);
    expect(moduleRef.get(UnitOfWork)).toBeInstanceOf(PrismaUnitOfWork);
    expect(moduleRef.get(EmailVerificationTokenRepository)).toBeInstanceOf(
      PrismaEmailVerificationTokenRepository,
    );
    expect(moduleRef.get(VerificationTokenGenerator)).toBeInstanceOf(
      CryptoVerificationTokenGenerator,
    );
    expect(moduleRef.get(EmailVerificationNotifier)).toBeInstanceOf(
      MailEmailVerificationNotifier,
    );
    expect(moduleRef.get(Clock)).toBeInstanceOf(SystemClock);
    for (const useCase of [
      RegisterStudentUseCase,
      RegisterPropertyOwnerUseCase,
      SendEmailVerificationUseCase,
      ConfirmEmailVerificationUseCase,
      ResendEmailVerificationUseCase,
    ]) {
      expect(moduleRef.get(useCase)).toBeInstanceOf(useCase);
    }
  });

  it('cadastra um estudante com as dependências reais', async () => {
    const useCase = moduleRef.get(RegisterStudentUseCase);

    const { userId, studentId } = await useCase.execute({
      name: 'Maria Silva',
      email: 'maria@ufal.br',
      cpf: '529.982.247-25',
      password: 'senha-segura-123',
      enrollmentNumber: '20231234',
      course: 'Ciência da Computação',
      period: 3,
      expectedGraduation: new Date('2027-12-15'),
    });

    const row = await prisma.user.findUnique({
      where: { id: userId },
      include: { student: true },
    });
    expect(row?.student?.id).toBe(studentId);
    expect(row?.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(
      await moduleRef
        .get(Hasher)
        .compare('senha-segura-123', row!.passwordHash),
    ).toBe(true);
  });
});
