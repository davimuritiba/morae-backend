import { VerificationStatus } from '../../../../../../shared/domain/enums/verification-status.enum.js';
import { PrismaService } from '../../../../../../shared/infra/database/prisma.service.js';
import { resetDatabase } from '../../../../../../../test/integration/reset-database.js';
import type { StudentProfileInput } from '../../../../domain/entities/student-profile.entity.js';
import { Student } from '../../../../domain/entities/student.entity.js';
import { User } from '../../../../domain/entities/user.entity.js';
import { EnrollmentNumberAlreadyInUseError } from '../../../../domain/errors/enrollment-number-already-in-use.error.js';
import { AcademicPeriod } from '../../../../domain/value-objects/academic-period.vo.js';
import { BudgetRange } from '../../../../domain/value-objects/budget-range.vo.js';
import { Cpf } from '../../../../domain/value-objects/cpf.vo.js';
import { Email } from '../../../../domain/value-objects/email.vo.js';
import { EnrollmentNumber } from '../../../../domain/value-objects/enrollment-number.vo.js';
import { PreferenceLevel } from '../../../../domain/value-objects/preference-level.vo.js';
import { TimeSlot } from '../../../../domain/value-objects/time-slot.vo.js';
import { PrismaStudentRepository } from '../../../../infra/persistence/repositories/prisma-student.repository.js';
import { PrismaUserRepository } from '../../../../infra/persistence/repositories/prisma-user.repository.js';

function makeProfileInput(
  overrides: Partial<StudentProfileInput> = {},
): StudentProfileInput {
  return {
    bio: 'Gosto de silêncio para estudar.',
    income: 1500.5,
    budget: BudgetRange.create(300, 800.25),
    isSmoker: false,
    noisePreference: PreferenceLevel.create(2),
    visitPreference: PreferenceLevel.create(4),
    schedule: { MONDAY: [TimeSlot.create('08:00', '12:00')] },
    ...overrides,
  };
}

describe('PrismaStudentRepository (integração)', () => {
  const prisma = new PrismaService();
  const users = new PrismaUserRepository(prisma);
  const repository = new PrismaStudentRepository(prisma);

  // Student exige um User existente (chave estrangeira).
  async function makeStudent(
    seed: { email: string; cpf: string; enrollment: string } = {
      email: 'maria@ufal.br',
      cpf: '529.982.247-25',
      enrollment: '20231234',
    },
  ): Promise<Student> {
    const user = User.create({
      name: 'Maria Silva',
      email: Email.create(seed.email),
      cpf: Cpf.create(seed.cpf),
      passwordHash: '$argon2id$hash',
    });
    await users.save(user);

    return Student.create({
      userId: user.id,
      enrollmentNumber: EnrollmentNumber.create(seed.enrollment),
      course: 'Ciência da Computação',
      period: AcademicPeriod.create(3),
      expectedGraduation: new Date('2027-12-15'),
    });
  }

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('salva e recupera o estudante sem perfil', async () => {
    const student = await makeStudent();

    await repository.save(student);
    const found = await repository.findById(student.id);

    expect(found).not.toBeNull();
    expect(found!.userId).toBe(student.userId);
    expect(found!.enrollmentNumber.value).toBe('20231234');
    expect(found!.course).toBe('Ciência da Computação');
    expect(found!.period.value).toBe(3);
    expect(found!.expectedGraduation).toEqual(new Date('2027-12-15'));
    expect(found!.verificationStatus).toBe(VerificationStatus.PENDING);
    expect(found!.profile).toBeNull();
  });

  it('salva o perfil junto com o estudante', async () => {
    const student = await makeStudent();
    student.defineProfile(makeProfileInput());

    await repository.save(student);
    const profile = (await repository.findById(student.id))!.profile!;

    expect(profile.id).toBe(student.profile!.id);
    expect(profile.studentId).toBe(student.id);
    expect(profile.income).toBe(1500.5);
    expect(profile.budget.min).toBe(300);
    expect(profile.budget.max).toBe(800.25);
    expect(profile.noisePreference.value).toBe(2);
    expect(profile.schedule.MONDAY?.map((s) => [s.start, s.end])).toEqual([
      ['08:00', '12:00'],
    ]);
  });

  it('cria o perfil num estudante já salvo e depois o atualiza', async () => {
    const student = await makeStudent();
    await repository.save(student);

    student.defineProfile(makeProfileInput());
    await repository.save(student);
    student.defineProfile(makeProfileInput({ bio: 'Nova bio', income: null }));
    student.verify();
    await repository.save(student);

    const found = (await repository.findById(student.id))!;
    expect(found.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(found.profile!.bio).toBe('Nova bio');
    expect(found.profile!.income).toBeNull();
    expect(await prisma.studentProfile.count()).toBe(1);
  });

  it('busca pelo usuário', async () => {
    const student = await makeStudent();
    await repository.save(student);

    expect((await repository.findByUserId(student.userId))?.id).toBe(
      student.id,
    );
    expect(
      await repository.findByUserId('0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10'),
    ).toBeNull();
    expect(await repository.findByUserId('nao-e-uuid')).toBeNull();
  });

  it('informa se a matrícula já existe', async () => {
    await repository.save(await makeStudent());

    expect(
      await repository.existsByEnrollmentNumber(
        EnrollmentNumber.create('20231234'),
      ),
    ).toBe(true);
    expect(
      await repository.existsByEnrollmentNumber(
        EnrollmentNumber.create('20239999'),
      ),
    ).toBe(false);
  });

  it('converte matrícula duplicada em EnrollmentNumberAlreadyInUseError', async () => {
    await repository.save(await makeStudent());
    const other = await makeStudent({
      email: 'outra@ufal.br',
      cpf: '111.444.777-35',
      enrollment: '20231234',
    });

    await expect(repository.save(other)).rejects.toThrow(
      EnrollmentNumberAlreadyInUseError,
    );
    expect(await prisma.student.count()).toBe(1);
  });
});
