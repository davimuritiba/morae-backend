import { InvalidBioError } from '../errors/invalid-bio.error.js';
import { InvalidCourseError } from '../errors/invalid-course.error.js';
import { InvalidExpectedGraduationError } from '../errors/invalid-expected-graduation.error.js';
import { InvalidIncomeError } from '../errors/invalid-income.error.js';
import { AcademicPeriod } from '../value-objects/academic-period.vo.js';
import { BudgetRange } from '../value-objects/budget-range.vo.js';
import { EnrollmentNumber } from '../value-objects/enrollment-number.vo.js';
import { PreferenceLevel } from '../value-objects/preference-level.vo.js';
import { TimeSlot } from '../value-objects/time-slot.vo.js';
import type {
  StudentProfileInput,
  WeeklySchedule,
} from './student-profile.entity.js';
import { Student, type CreateStudentProps } from './student.entity.js';

function makeStudent(overrides: Partial<CreateStudentProps> = {}): Student {
  return Student.create({
    userId: 'user-1',
    enrollmentNumber: EnrollmentNumber.create('123456'),
    course: 'Ciência da Computação',
    period: AcademicPeriod.create(3),
    expectedGraduation: new Date('2028-12-01'),
    ...overrides,
  });
}

function makeProfileInput(
  overrides: Partial<StudentProfileInput> = {},
): StudentProfileInput {
  return {
    bio: 'Gosto de silêncio.',
    income: 1500,
    budget: BudgetRange.create(300, 800),
    isSmoker: false,
    noisePreference: PreferenceLevel.create(2),
    visitPreference: PreferenceLevel.create(3),
    schedule: { MONDAY: [TimeSlot.create('08:00', '12:00')] },
    ...overrides,
  };
}

describe('Student', () => {
  it('ignora studentId e campos extras vindos no input do perfil', () => {
    const student = makeStudent();
    const body = {
      ...makeProfileInput(),
      studentId: 'outro-estudante',
      isAdmin: true,
    };

    student.defineProfile(body);

    expect(student.profile?.studentId).toBe(student.id);
    expect(JSON.stringify(student.profile)).not.toContain('isAdmin');
  });

  it('mantém o id do perfil ao atualizá-lo', () => {
    const student = makeStudent();
    student.defineProfile(makeProfileInput());
    const profileId = student.profile?.id;

    student.defineProfile(makeProfileInput({ bio: 'Nova bio' }));

    expect(student.profile?.id).toBe(profileId);
    expect(student.profile?.bio).toBe('Nova bio');
  });

  it('não permite alterar a agenda do perfil por fora da raiz', () => {
    const student = makeStudent();
    const input = makeProfileInput();
    student.defineProfile(input);

    input.schedule.MONDAY?.push(TimeSlot.create('13:00', '14:00'));
    student.profile?.schedule.MONDAY?.push(TimeSlot.create('15:00', '16:00'));

    expect(student.profile?.schedule.MONDAY).toHaveLength(1);
  });

  it('descarta chaves desconhecidas da agenda', () => {
    const student = makeStudent();
    // Simula um corpo de requisição com uma chave que o tipo não permite.
    const schedule = {
      FUNDAY: [TimeSlot.create('08:00', '09:00')],
    } as unknown as WeeklySchedule;

    student.defineProfile(makeProfileInput({ schedule }));

    expect(student.profile?.schedule).toEqual({});
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejeita renda inválida: %s',
    (income) => {
      expect(() =>
        makeStudent().defineProfile(makeProfileInput({ income })),
      ).toThrow(InvalidIncomeError);
    },
  );

  it('aceita renda nula', () => {
    const student = makeStudent();
    student.defineProfile(makeProfileInput({ income: null }));
    expect(student.profile?.income).toBeNull();
  });

  it('rejeita bio longa demais', () => {
    expect(() =>
      makeStudent().defineProfile(makeProfileInput({ bio: 'a'.repeat(501) })),
    ).toThrow(InvalidBioError);
  });

  it.each(['', '   ', 'a'.repeat(101)])(
    'rejeita curso inválido: %j',
    (course) => {
      expect(() => makeStudent({ course })).toThrow(InvalidCourseError);
    },
  );

  it('rejeita data de formatura inválida', () => {
    expect(() =>
      makeStudent({ expectedGraduation: new Date('não é data') }),
    ).toThrow(InvalidExpectedGraduationError);
  });

  it('não expõe dados ao ser serializado', () => {
    expect(JSON.stringify(makeStudent())).toBe('{}');
  });
});
