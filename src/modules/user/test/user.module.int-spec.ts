import { Test, type TestingModule } from '@nestjs/testing';
import { resetDatabase } from '../../../../test/integration/reset-database.js';
import { UnitOfWork } from '../../../shared/application/unit-of-work.js';
import { DatabaseModule } from '../../../shared/infra/database/database.module.js';
import { PrismaUnitOfWork } from '../../../shared/infra/database/prisma-unit-of-work.js';
import { PrismaService } from '../../../shared/infra/database/prisma.service.js';
import { Hasher } from '../application/ports/hasher.port.js';
import { RegisterStudentUseCase } from '../application/use-cases/register-student/register-student.use-case.js';
import { StudentRepository } from '../domain/repositories/student.repository.js';
import { UserRepository } from '../domain/repositories/user.repository.js';
import { PrismaStudentRepository } from '../infra/persistence/repositories/prisma-student.repository.js';
import { PrismaUserRepository } from '../infra/persistence/repositories/prisma-user.repository.js';
import { Argon2Hasher } from '../infra/services/argon2-hasher.js';
import { UserModule } from '../user.module.js';

describe('UserModule (integração)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [DatabaseModule, UserModule],
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
    expect(moduleRef.get(Hasher)).toBeInstanceOf(Argon2Hasher);
    expect(moduleRef.get(UnitOfWork)).toBeInstanceOf(PrismaUnitOfWork);
    expect(moduleRef.get(RegisterStudentUseCase)).toBeInstanceOf(
      RegisterStudentUseCase,
    );
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
