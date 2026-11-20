import { VerificationStatus } from '../../../../../shared/domain/enums/verification-status.enum.js';
import { InMemoryUnitOfWork } from '../../../../../shared/infra/database/in-memory-unit-of-work.js';
import { FakeLogger } from '../../../../../shared/test/fakes/fake-logger.js';
import { FixedClock } from '../../../../../shared/test/fakes/fixed-clock.js';
import type { RegisterStudentInput } from '../../../application/use-cases/register-student/register-student.input.js';
import { RegisterStudentUseCase } from '../../../application/use-cases/register-student/register-student.use-case.js';
import { SendEmailVerificationUseCase } from '../../../application/use-cases/send-email-verification/send-email-verification.use-case.js';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import { CpfAlreadyInUseError } from '../../../domain/errors/cpf-already-in-use.error.js';
import { EmailAlreadyInUseError } from '../../../domain/errors/email-already-in-use.error.js';
import { EnrollmentNumberAlreadyInUseError } from '../../../domain/errors/enrollment-number-already-in-use.error.js';
import { InvalidAcademicPeriodError } from '../../../domain/errors/invalid-academic-period.error.js';
import { InvalidCourseError } from '../../../domain/errors/invalid-course.error.js';
import { InvalidCpfError } from '../../../domain/errors/invalid-cpf.error.js';
import { InvalidEmailError } from '../../../domain/errors/invalid-email.error.js';
import { InvalidEnrollmentNumberError } from '../../../domain/errors/invalid-enrollment-number.error.js';
import { InvalidNameError } from '../../../domain/errors/invalid-name.error.js';
import { InvalidPasswordError } from '../../../domain/errors/invalid-password.error.js';
import { InvalidPhoneError } from '../../../domain/errors/invalid-phone.error.js';
import { InMemoryEmailVerificationTokenRepository } from '../../../infra/persistence/in-memory/in-memory-email-verification-token.repository.js';
import { InMemoryStudentRepository } from '../../../infra/persistence/in-memory/in-memory-student.repository.js';
import { InMemoryPropertyOwnerRepository } from '../../../infra/persistence/in-memory/in-memory-property-owner.repository.js';
import { InMemoryUserRepository } from '../../../infra/persistence/in-memory/in-memory-user.repository.js';
import { FakeEmailVerificationNotifier } from '../../fakes/fake-email-verification-notifier.js';
import { FakeHasher } from '../../fakes/fake-hasher.js';
import { FakeVerificationTokenGenerator } from '../../fakes/fake-verification-token-generator.js';

function makeInput(
  overrides: Partial<RegisterStudentInput> = {},
): RegisterStudentInput {
  return {
    name: 'Maria Silva',
    email: 'maria@ufal.br',
    cpf: '529.982.247-25',
    password: 'senha-segura-123',
    phone: '(82) 99999-1234',
    enrollmentNumber: '20231234',
    course: 'Ciência da Computação',
    period: 3,
    expectedGraduation: new Date('2027-12-15'),
    compatibilityAnswers: {
      sleepTime: 'FROM_23_TO_01',
      studyAtHome: 'SOMETIMES',
      organization: 'VERY_ORGANIZED',
      visitors: 'SOMETIMES',
      smoking: 'NO',
      pets: 'NO',
      cleaning: 'WEEKLY',
      environment: 'QUIET',
      lifestyle: ['CALM', 'STUDIOUS'],
    },
    ...overrides,
  };
}

describe('RegisterStudentUseCase', () => {
  let users: InMemoryUserRepository;
  let students: InMemoryStudentRepository;
  let propertyOwners: InMemoryPropertyOwnerRepository;
  let hasher: FakeHasher;
  let tokens: InMemoryEmailVerificationTokenRepository;
  let notifier: FakeEmailVerificationNotifier;
  let logger: FakeLogger;
  let sut: RegisterStudentUseCase;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    students = new InMemoryStudentRepository();
    propertyOwners = new InMemoryPropertyOwnerRepository();
    hasher = new FakeHasher();
    tokens = new InMemoryEmailVerificationTokenRepository();
    notifier = new FakeEmailVerificationNotifier();
    logger = new FakeLogger();
    const unitOfWork = new InMemoryUnitOfWork();
    const sendEmailVerification = new SendEmailVerificationUseCase(
      users,
      tokens,
      new FakeVerificationTokenGenerator(),
      notifier,
      new FixedClock(new Date('2026-11-12T10:00:00.000Z')),
      unitOfWork,
      { tokenTtlMs: 24 * 60 * 60 * 1000 },
    );
    sut = new RegisterStudentUseCase(
      users,
      students,
      propertyOwners,
      hasher,
      unitOfWork,
      sendEmailVerification,
      logger,
    );
  });

  it('envia o link de verificação para o e-mail cadastrado', async () => {
    const { userId } = await sut.execute(makeInput());

    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0].to).toBe('maria@ufal.br');
    expect(tokens.items[0].userId).toBe(userId);
  });

  it('conclui o cadastro mesmo se o e-mail falhar, registrando o erro', async () => {
    const failure = new Error('servidor de e-mail fora do ar');
    notifier.failWith = failure;

    const output = await sut.execute(makeInput());

    expect(output.userId).toBe(users.items[0].id);
    expect(students.items).toHaveLength(1);
    expect(logger.errors).toHaveLength(1);
    expect(logger.errors[0].message).toContain(output.userId);
    expect(logger.errors[0].error).toBe(failure);
  });

  it('não envia e-mail quando o cadastro é recusado', async () => {
    await expect(sut.execute(makeInput({ cpf: '123' }))).rejects.toThrow();

    expect(notifier.sent).toHaveLength(0);
    expect(tokens.items).toHaveLength(0);
  });

  it('cria o usuário e o estudante vinculados', async () => {
    const output = await sut.execute(makeInput());

    expect(users.items).toHaveLength(1);
    expect(students.items).toHaveLength(1);
    const [user] = users.items;
    const [student] = students.items;
    expect(output).toEqual({ userId: user.id, studentId: student.id });
    expect(student.userId).toBe(user.id);
  });

  it('cria também o perfil de proprietário para estudante ofertador', async () => {
    const output = await sut.execute(makeInput({ advertisesProperty: true }));
    expect(output.propertyOwnerId).toBe(propertyOwners.items[0].id);
    expect(propertyOwners.items[0].userId).toBe(output.userId);
    expect(students.items[0].userId).toBe(output.userId);
  });

  it('cria a conta ativa, com e-mail não verificado e estudante pendente', async () => {
    await sut.execute(makeInput());

    const [user] = users.items;
    const [student] = students.items;
    expect(user.status).toBe(AccountStatus.ACTIVE);
    expect(user.emailVerified).toBe(false);
    expect(student.verificationStatus).toBe(VerificationStatus.PENDING);
    expect(student.profile).toBeNull();
  });

  it('guarda apenas o hash da senha', async () => {
    await sut.execute(makeInput({ password: 'senha-segura-123' }));

    expect(users.items[0].passwordHash).toBe('hashed:senha-segura-123');
  });

  it('normaliza e-mail, CPF e telefone', async () => {
    await sut.execute(
      makeInput({
        email: '  Maria@UFAL.br ',
        cpf: '52998224725',
        phone: '+55 (82) 99999-1234',
      }),
    );

    const [user] = users.items;
    expect(user.email.value).toBe('maria@ufal.br');
    expect(user.cpf.value).toBe('52998224725');
    expect(user.phone?.value).toBe('82999991234');
  });

  it.each([null, undefined, ''])(
    'aceita cadastro sem telefone: %j',
    async (phone) => {
      await sut.execute(makeInput({ phone }));

      expect(users.items[0].phone).toBeNull();
    },
  );

  it('rejeita e-mail já cadastrado', async () => {
    await sut.execute(makeInput());

    await expect(
      sut.execute(
        makeInput({ cpf: '111.444.777-35', enrollmentNumber: '20239999' }),
      ),
    ).rejects.toThrow(EmailAlreadyInUseError);
    expect(users.items).toHaveLength(1);
    expect(students.items).toHaveLength(1);
  });

  it('rejeita CPF já cadastrado', async () => {
    await sut.execute(makeInput());

    await expect(
      sut.execute(
        makeInput({ email: 'outra@ufal.br', enrollmentNumber: '20239999' }),
      ),
    ).rejects.toThrow(CpfAlreadyInUseError);
    expect(users.items).toHaveLength(1);
  });

  it('rejeita matrícula já cadastrada sem criar o usuário', async () => {
    await sut.execute(makeInput());

    await expect(
      sut.execute(makeInput({ email: 'outra@ufal.br', cpf: '111.444.777-35' })),
    ).rejects.toThrow(EnrollmentNumberAlreadyInUseError);
    expect(users.items).toHaveLength(1);
    expect(students.items).toHaveLength(1);
  });

  it.each([
    { field: 'email', overrides: { email: 'abc' }, error: InvalidEmailError },
    { field: 'cpf', overrides: { cpf: '123' }, error: InvalidCpfError },
    {
      field: 'password',
      overrides: { password: 'curta' },
      error: InvalidPasswordError,
    },
    { field: 'phone', overrides: { phone: '123' }, error: InvalidPhoneError },
    {
      field: 'enrollmentNumber',
      overrides: { enrollmentNumber: 'abc' },
      error: InvalidEnrollmentNumberError,
    },
    {
      field: 'period',
      overrides: { period: 0 },
      error: InvalidAcademicPeriodError,
    },
  ])(
    'rejeita $field inválido sem gerar hash nem salvar',
    async ({ overrides, error }) => {
      const hashSpy = vi.spyOn(hasher, 'hash');

      await expect(sut.execute(makeInput(overrides))).rejects.toThrow(error);
      expect(hashSpy).not.toHaveBeenCalled();
      expect(users.items).toHaveLength(0);
      expect(students.items).toHaveLength(0);
    },
  );

  it.each([
    { field: 'name', overrides: { name: '   ' }, error: InvalidNameError },
    { field: 'course', overrides: { course: '' }, error: InvalidCourseError },
  ])('rejeita $field inválido sem salvar', async ({ overrides, error }) => {
    await expect(sut.execute(makeInput(overrides))).rejects.toThrow(error);
    expect(users.items).toHaveLength(0);
    expect(students.items).toHaveLength(0);
  });
});
