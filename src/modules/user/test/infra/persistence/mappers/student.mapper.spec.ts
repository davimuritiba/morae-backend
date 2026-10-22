import { VerificationStatus } from '../../../../../../shared/domain/enums/verification-status.enum.js';
import {
  Prisma,
  type StudentProfile as PrismaStudentProfile,
} from '../../../../../../shared/infra/database/generated/prisma/client.js';
import { Student } from '../../../../domain/entities/student.entity.js';
import { InvalidTimeSlotError } from '../../../../domain/errors/invalid-time-slot.error.js';
import { AcademicPeriod } from '../../../../domain/value-objects/academic-period.vo.js';
import { BudgetRange } from '../../../../domain/value-objects/budget-range.vo.js';
import { EnrollmentNumber } from '../../../../domain/value-objects/enrollment-number.vo.js';
import { PreferenceLevel } from '../../../../domain/value-objects/preference-level.vo.js';
import { TimeSlot } from '../../../../domain/value-objects/time-slot.vo.js';
import {
  StudentMapper,
  type PrismaStudentWithProfile,
} from '../../../../infra/persistence/mappers/student.mapper.js';

const STUDENT_ID = '5d2c9a4e-1b7f-4e3a-8c6d-2f9e1a0b3c4d';

function makeStudent(): Student {
  return Student.create({
    userId: '0b6f3c1e-8f2a-4c1d-9a51-3f1f2c7d9e10',
    enrollmentNumber: EnrollmentNumber.create('20231234'),
    course: 'Ciência da Computação',
    period: AcademicPeriod.create(3),
    expectedGraduation: new Date('2027-12-15'),
  });
}

function withProfile(student: Student): Student {
  student.defineProfile({
    bio: 'Gosto de silêncio para estudar.',
    income: 1500.5,
    budget: BudgetRange.create(300, 800.25),
    isSmoker: false,
    noisePreference: PreferenceLevel.create(2),
    visitPreference: PreferenceLevel.create(4),
    schedule: {
      MONDAY: [TimeSlot.create('08:00', '12:00')],
      WEDNESDAY: [
        TimeSlot.create('08:00', '10:00'),
        TimeSlot.create('14:00', '18:00'),
      ],
    },
  });
  return student;
}

// Simula o que o Prisma devolve depois de gravar o agregado: Decimal nas
// colunas numéricas e JSON puro na agenda.
function toRow(student: Student): PrismaStudentWithProfile {
  const profile = student.profile;
  if (!profile) {
    return { ...StudentMapper.toPersistence(student), profile: null };
  }

  const data = StudentMapper.profileToPersistence(profile);
  return {
    ...StudentMapper.toPersistence(student),
    profile: {
      id: data.id as string,
      // Preenchido pelo Prisma no nested write.
      studentId: student.id,
      bio: data.bio,
      income:
        data.income == null ? null : new Prisma.Decimal(data.income as number),
      minBudget: new Prisma.Decimal(data.minBudget as number),
      maxBudget: new Prisma.Decimal(data.maxBudget as number),
      isSmoker: data.isSmoker,
      noisePreference: data.noisePreference,
      visitPreference: data.visitPreference,
      schedule: data.schedule as Prisma.JsonValue,
      updatedAt: data.updatedAt as Date,
    },
  };
}

function makeProfileRow(
  overrides: Partial<PrismaStudentProfile> = {},
): PrismaStudentProfile {
  return {
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    studentId: STUDENT_ID,
    bio: '',
    income: null,
    minBudget: new Prisma.Decimal('300.50'),
    maxBudget: new Prisma.Decimal('900.00'),
    isSmoker: true,
    noisePreference: 5,
    visitPreference: 1,
    schedule: {},
    updatedAt: new Date('2026-10-02T12:00:00.000Z'),
    ...overrides,
  };
}

describe('StudentMapper', () => {
  it('converte os VOs e o status em valores de coluna', () => {
    const student = makeStudent();

    expect(StudentMapper.toPersistence(student)).toEqual({
      id: student.id,
      userId: student.userId,
      enrollmentNumber: '20231234',
      course: 'Ciência da Computação',
      period: 3,
      expectedGraduation: student.expectedGraduation,
      verificationStatus: 'PENDING',
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    });
  });

  it('converte o perfil: faixa de orçamento em duas colunas e agenda em JSON', () => {
    const profile = withProfile(makeStudent()).profile!;

    expect(StudentMapper.profileToPersistence(profile)).toEqual({
      id: profile.id,
      bio: 'Gosto de silêncio para estudar.',
      income: 1500.5,
      minBudget: 300,
      maxBudget: 800.25,
      isSmoker: false,
      noisePreference: 2,
      visitPreference: 4,
      schedule: {
        MONDAY: [{ start: '08:00', end: '12:00' }],
        WEDNESDAY: [
          { start: '08:00', end: '10:00' },
          { start: '14:00', end: '18:00' },
        ],
      },
      updatedAt: profile.updatedAt,
    });
  });

  it('preserva o agregado sem perfil na ida e volta', () => {
    const student = makeStudent();
    student.reject();

    const restored = StudentMapper.toDomain(toRow(student));

    expect(restored.id).toBe(student.id);
    expect(restored.userId).toBe(student.userId);
    expect(restored.enrollmentNumber.equals(student.enrollmentNumber)).toBe(
      true,
    );
    expect(restored.course).toBe(student.course);
    expect(restored.period.equals(student.period)).toBe(true);
    expect(restored.expectedGraduation).toEqual(student.expectedGraduation);
    expect(restored.verificationStatus).toBe(VerificationStatus.REJECTED);
    expect(restored.profile).toBeNull();
  });

  it('preserva o agregado com perfil na ida e volta', () => {
    const student = withProfile(makeStudent());
    const profile = student.profile!;

    const restored = StudentMapper.toDomain(toRow(student)).profile!;

    expect(restored.id).toBe(profile.id);
    expect(restored.studentId).toBe(student.id);
    expect(restored.bio).toBe(profile.bio);
    expect(restored.income).toBe(1500.5);
    expect(restored.budget.equals(profile.budget)).toBe(true);
    expect(restored.isSmoker).toBe(false);
    expect(restored.noisePreference.equals(profile.noisePreference)).toBe(true);
    expect(restored.visitPreference.equals(profile.visitPreference)).toBe(true);
    expect(restored.schedule.MONDAY?.map((s) => [s.start, s.end])).toEqual([
      ['08:00', '12:00'],
    ]);
    expect(restored.schedule.WEDNESDAY).toHaveLength(2);
    expect(restored.schedule.FRIDAY).toBeUndefined();
    expect(restored.updatedAt).toEqual(profile.updatedAt);
  });

  it('converte Decimal do banco em number', () => {
    const row = {
      ...StudentMapper.toPersistence(makeStudent()),
      profile: makeProfileRow({ income: new Prisma.Decimal('1234.56') }),
    };

    const profile = StudentMapper.toDomain(row).profile!;

    expect(profile.income).toBe(1234.56);
    expect(profile.budget.min).toBe(300.5);
    expect(profile.budget.max).toBe(900);
  });

  it('ignora chaves da agenda que não são dias da semana', () => {
    const row = {
      ...StudentMapper.toPersistence(makeStudent()),
      profile: makeProfileRow({
        schedule: {
          FUNDAY: [{ start: '08:00', end: '09:00' }],
          TUESDAY: [{ start: '19:00', end: '22:00' }],
        },
      }),
    };

    const schedule = StudentMapper.toDomain(row).profile!.schedule;

    expect(Object.keys(schedule)).toEqual(['TUESDAY']);
  });

  it.each([
    [{ MONDAY: [{ start: '25:00', end: '26:00' }] }],
    [{ MONDAY: [{ start: '08:00' }] }],
    [{ MONDAY: ['08:00-12:00'] }],
  ])('rejeita horário corrompido na agenda: %j', (schedule) => {
    const row = {
      ...StudentMapper.toPersistence(makeStudent()),
      profile: makeProfileRow({ schedule }),
    };

    expect(() => StudentMapper.toDomain(row)).toThrow(InvalidTimeSlotError);
  });
});
