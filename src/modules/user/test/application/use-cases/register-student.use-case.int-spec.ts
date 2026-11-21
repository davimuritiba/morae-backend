import { resetDatabase } from '../../../../../../test/integration/reset-database.js';
import { PrismaTransactionContext } from '../../../../../shared/infra/database/prisma-transaction-context.js';
import { PrismaUnitOfWork } from '../../../../../shared/infra/database/prisma-unit-of-work.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { FakeLogger } from '../../../../../shared/test/fakes/fake-logger.js';
import { FixedClock } from '../../../../../shared/test/fakes/fixed-clock.js';
import type { Hasher } from '../../../application/ports/hasher.port.js';
import type { RegisterStudentInput } from '../../../application/use-cases/register-student/register-student.input.js';
import { RegisterStudentUseCase } from '../../../application/use-cases/register-student/register-student.use-case.js';
import { SendEmailVerificationUseCase } from '../../../application/use-cases/send-email-verification/send-email-verification.use-case.js';
import { EnrollmentNumberAlreadyInUseError } from '../../../domain/errors/enrollment-number-already-in-use.error.js';
import { PrismaEmailVerificationTokenRepository } from '../../../infra/persistence/repositories/prisma-email-verification-token.repository.js';
import { PrismaStudentRepository } from '../../../infra/persistence/repositories/prisma-student.repository.js';
import { PrismaUserRepository } from '../../../infra/persistence/repositories/prisma-user.repository.js';
import { CryptoVerificationTokenGenerator } from '../../../infra/services/crypto-verification-token-generator.js';
import { FakeEmailVerificationNotifier } from '../../fakes/fake-email-verification-notifier.js';
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
  let notifier: FakeEmailVerificationNotifier;

  // Repositórios e transação reais; só o envio do e-mail é falso.
  function build(hasher: Hasher): RegisterStudentUseCase {
    const sendEmailVerification = new SendEmailVerificationUseCase(
      users,
      new PrismaEmailVerificationTokenRepository(context),
      new CryptoVerificationTokenGenerator(),
      notifier,
      new FixedClock(new Date('2026-11-12T10:00:00.000Z')),
      unitOfWork,
      { tokenTtlMs: 24 * 60 * 60 * 1000 },
    );
    return new RegisterStudentUseCase(
      users,
      students,
      hasher,
      unitOfWork,
      sendEmailVerification,
      new FakeLogger(),
    );
  }

  beforeEach(async () => {
    await resetDatabase(prisma);
    notifier = new FakeEmailVerificationNotifier();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('grava o usuário, o estudante e o token de verificação no banco', async () => {
    const sut = build(new FakeHasher());

    const { userId, studentId } = await sut.execute(makeInput());

    expect((await users.findById(userId))?.email.value).toBe('maria@ufal.br');
    expect((await students.findById(studentId))?.userId).toBe(userId);
    expect(
      await prisma.emailVerificationToken.count({ where: { userId } }),
    ).toBe(1);
    expect(notifier.sent).toHaveLength(1);
  });

  it('não deixa usuário sem estudante quando a matrícula duplica numa corrida', async () => {
    const sut = build(new BarrierHasher(2));

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
