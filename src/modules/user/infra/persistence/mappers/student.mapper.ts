import type {
  Prisma,
  Student as PrismaStudent,
  StudentProfile as PrismaStudentProfile,
} from '../../../../../shared/infra/database/generated/prisma/client.js';
import {
  verificationStatusToDomain,
  verificationStatusToPrisma,
} from '../../../../../shared/infra/database/mappers/verification-status.mapper.js';
import {
  WEEKDAYS,
  StudentProfile,
  type WeeklySchedule,
} from '../../../domain/entities/student-profile.entity.js';
import { Student } from '../../../domain/entities/student.entity.js';
import { AcademicPeriod } from '../../../domain/value-objects/academic-period.vo.js';
import { BudgetRange } from '../../../domain/value-objects/budget-range.vo.js';
import { EnrollmentNumber } from '../../../domain/value-objects/enrollment-number.vo.js';
import { PreferenceLevel } from '../../../domain/value-objects/preference-level.vo.js';
import { TimeSlot } from '../../../domain/value-objects/time-slot.vo.js';

// O Student é um agregado: toda leitura traz o perfil junto. O repositório
// usa este mesmo include nas consultas.
export const studentInclude = {
  profile: true,
} as const satisfies Prisma.StudentInclude;

export type PrismaStudentWithProfile = Prisma.StudentGetPayload<{
  include: typeof studentInclude;
}>;

// Formato da coluna student_profiles.schedule:
// { "MONDAY": [{ "start": "08:00", "end": "12:00" }], ... }
type ScheduleJson = Partial<Record<string, { start: string; end: string }[]>>;

// Converte entre o agregado Student (+ StudentProfile) e as tabelas
// students e student_profiles.
export class StudentMapper {
  static toDomain(raw: PrismaStudentWithProfile): Student {
    return Student.restore(raw.id, {
      userId: raw.userId,
      enrollmentNumber: EnrollmentNumber.create(raw.enrollmentNumber),
      course: raw.course,
      period: AcademicPeriod.create(raw.period),
      expectedGraduation: raw.expectedGraduation,
      verificationStatus: verificationStatusToDomain[raw.verificationStatus],
      profile: raw.profile ? StudentMapper.profileToDomain(raw.profile) : null,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  // Só a linha de students; o perfil vai à parte em profileToPersistence.
  static toPersistence(student: Student): PrismaStudent {
    return {
      id: student.id,
      userId: student.userId,
      enrollmentNumber: student.enrollmentNumber.value,
      course: student.course,
      period: student.period.value,
      expectedGraduation: student.expectedGraduation,
      verificationStatus:
        verificationStatusToPrisma[student.verificationStatus],
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
  }

  // Sem studentId: o perfil é gravado aninhado no Student (nested write), e o
  // Prisma preenche a chave estrangeira.
  static profileToPersistence(
    profile: StudentProfile,
  ): Prisma.StudentProfileCreateWithoutStudentInput {
    return {
      id: profile.id,
      bio: profile.bio,
      income: profile.income,
      minBudget: profile.budget.min,
      maxBudget: profile.budget.max,
      isSmoker: profile.isSmoker,
      noisePreference: profile.noisePreference.value,
      visitPreference: profile.visitPreference.value,
      schedule: scheduleToPersistence(profile.schedule),
      updatedAt: profile.updatedAt,
    };
  }

  private static profileToDomain(raw: PrismaStudentProfile): StudentProfile {
    return StudentProfile.restore(raw.id, {
      studentId: raw.studentId,
      bio: raw.bio,
      // Decimal → number: as colunas têm 2 casas decimais, sem perda.
      income: raw.income === null ? null : raw.income.toNumber(),
      budget: BudgetRange.create(
        raw.minBudget.toNumber(),
        raw.maxBudget.toNumber(),
      ),
      isSmoker: raw.isSmoker,
      noisePreference: PreferenceLevel.create(raw.noisePreference),
      visitPreference: PreferenceLevel.create(raw.visitPreference),
      schedule: scheduleToDomain(raw.schedule),
      updatedAt: raw.updatedAt,
    });
  }
}

function scheduleToPersistence(schedule: WeeklySchedule): ScheduleJson {
  const json: ScheduleJson = {};
  for (const day of WEEKDAYS) {
    const slots = schedule[day];
    if (slots) {
      json[day] = slots.map((slot) => ({ start: slot.start, end: slot.end }));
    }
  }
  return json;
}

// A coluna é JSON livre para o banco: cada horário volta pelo TimeSlot, que
// rejeita qualquer valor fora do formato esperado.
function scheduleToDomain(raw: Prisma.JsonValue): WeeklySchedule {
  const schedule: WeeklySchedule = {};
  if (!isJsonObject(raw)) return schedule;

  for (const day of WEEKDAYS) {
    const slots = raw[day];
    if (!Array.isArray(slots)) continue;

    schedule[day] = slots.map((slot) => {
      const start = isJsonObject(slot) ? slot['start'] : undefined;
      const end = isJsonObject(slot) ? slot['end'] : undefined;
      return TimeSlot.create(
        typeof start === 'string' ? start : '',
        typeof end === 'string' ? end : '',
      );
    });
  }
  return schedule;
}

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
