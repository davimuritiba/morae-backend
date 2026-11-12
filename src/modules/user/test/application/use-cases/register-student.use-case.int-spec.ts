import { resetDatabase } from '../../../../../../test/integration/reset-database.js';
import { PrismaTransactionContext } from '../../../../../shared/infra/database/prisma-transaction-context.js';
import { PrismaUnitOfWork } from '../../../../../shared/infra/database/prisma-unit-of-work.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import type { RegisterStudentInput } from '../../../application/use-cases/register-student/register-student.input.js';
import { RegisterStudentUseCase } from '../../../application/use-cases/register-student/register-student.use-case.js';
import { EnrollmentNumberAlreadyInUseError } from '../../../domain/errors/enrollment-number-already-in-use.error.js';
import { PrismaStudentRepository } from '../../../infra/persistence/repositories/prisma-student.repository.js';
import { PrismaUserRepository } from '../../../infra/persistence/repositories/prisma-user.repository.js';
import { FakeHasher } from '../../fakes/fake-hasher.js';

// Só libera o hash quando todas as requisições chegaram até ele, ou seja,
// quando todas já passaram pelas checagens de duplicidade do caso de uso.
// Isso força a corrida que só a constraint do banco consegue barrar.
class BarrierHasher extends FakeHasher {
  readonly #waiting: (() => void)[] = [];

  constructor(private readonly parties: number) {
    super();
  }

  override async hash(plain: string): Promise<string> {
    await new Promise<void>((resolve) => {
      this.#waiting.push(resolve);
      if (this.#waiting.length === this.parties) {
        this.#waiting.forEach((release) => release());
      }
    });
    return super.hash(plain);
  }
}

function makeInput(
  overrides: Partial<RegisterStudentInput> = {},
): RegisterStudentInput {
  return {
    name: 'Maria Silva',
    email: 'maria@ufal.br',
    cpf: '529.982.247-25',
    password: 'senha-segura-123',
    enrollmentNumber: '20231234',
    course: 'Ciência da Computação',
    period: 3,
    expectedGraduation: new Date('2027-12-15'),
    ...overrides,
  };
}

describe('RegisterStudentUseCase com Prisma (integração)', () => {
  const prisma = new PrismaService();
  const context = new PrismaTransactionContext(prisma);
  const users = new PrismaUserRepository(context);
  const students = new PrismaStudentRepository(context);
  const unitOfWork = new PrismaUnitOfWork(context);

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('grava o usuário e o estudante no banco', async () => {
    const sut = new RegisterStudentUseCase(
      users,
      students,
      new FakeHasher(),
      unitOfWork,
    );

    const { userId, studentId } = await sut.execute(makeInput());

    expect((await users.findById(userId))?.email.value).toBe('maria@ufal.br');
    expect((await students.findById(studentId))?.userId).toBe(userId);
  });

  it('não deixa usuário sem estudante quando a matrícula duplica numa corrida', async () => {
    const sut = new RegisterStudentUseCase(
      users,
      students,
      new BarrierHasher(2),
      unitOfWork,
    );

    // Mesma matrícula, e-mail e CPF diferentes: as duas passam pelas
    // checagens e só a constraint UNIQUE de students barra a segunda.
    const results = await Promise.allSettled([
      sut.execute(makeInput()),
      sut.execute(makeInput({ email: 'outra@ufal.br', cpf: '111.444.777-35' })),
    ]);

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      EnrollmentNumberAlreadyInUseError,
    );
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.student.count()).toBe(1);
    expect(await prisma.user.count({ where: { student: null } })).toBe(0);
  });
});
