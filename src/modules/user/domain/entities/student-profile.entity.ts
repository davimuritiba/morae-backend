import { randomUUID } from 'node:crypto';
import { InvalidBioError } from '../errors/invalid-bio.error.js';
import { InvalidIncomeError } from '../errors/invalid-income.error.js';
import type { BudgetRange } from '../value-objects/budget-range.vo.js';
import type { PreferenceLevel } from '../value-objects/preference-level.vo.js';
import type { TimeSlot } from '../value-objects/time-slot.vo.js';

export const WEEKDAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type WeeklySchedule = Partial<Record<Weekday, TimeSlot[]>>;

const BIO_MAX_LENGTH = 500;

export interface StudentProfileProps {
  studentId: string;
  bio: string;
  income: number | null;
  budget: BudgetRange;
  isSmoker: boolean;
  noisePreference: PreferenceLevel;
  visitPreference: PreferenceLevel;
  schedule: WeeklySchedule;
  updatedAt: Date;
}

// Campos que o estudante preenche/edita no perfil.
export type StudentProfileInput = Omit<
  StudentProfileProps,
  'studentId' | 'updatedAt'
>;

// Imutável: alterações geram um novo perfil (mesmo id), que só o Student,
// raiz do agregado, consegue guardar. Assim ninguém altera o perfil por fora.
export class StudentProfile {
  readonly #id: string;
  readonly #props: StudentProfileProps;

  private constructor(id: string, props: StudentProfileProps) {
    this.#id = id;
    this.#props = props;
  }

  static create(studentId: string, input: StudentProfileInput): StudentProfile {
    return new StudentProfile(randomUUID(), {
      studentId,
      ...StudentProfile.sanitize(input),
      updatedAt: new Date(),
    });
  }

  static restore(id: string, props: StudentProfileProps): StudentProfile {
    return new StudentProfile(id, {
      ...props,
      schedule: copySchedule(props.schedule),
    });
  }

  get id(): string {
    return this.#id;
  }

  get studentId(): string {
    return this.#props.studentId;
  }

  get bio(): string {
    return this.#props.bio;
  }

  get income(): number | null {
    return this.#props.income;
  }

  get budget(): BudgetRange {
    return this.#props.budget;
  }

  get isSmoker(): boolean {
    return this.#props.isSmoker;
  }

  get noisePreference(): PreferenceLevel {
    return this.#props.noisePreference;
  }

  get visitPreference(): PreferenceLevel {
    return this.#props.visitPreference;
  }

  // Cópia, para que a agenda não seja alterada por fora.
  get schedule(): WeeklySchedule {
    return copySchedule(this.#props.schedule);
  }

  get updatedAt(): Date {
    return this.#props.updatedAt;
  }

  withChanges(input: StudentProfileInput): StudentProfile {
    return new StudentProfile(this.#id, {
      studentId: this.#props.studentId,
      ...StudentProfile.sanitize(input),
      updatedAt: new Date(),
    });
  }

  // Valida e copia campo a campo: propriedades extras que venham junto com o
  // input (ex.: `studentId` num corpo de requisição) são descartadas.
  private static sanitize(input: StudentProfileInput): StudentProfileInput {
    const bio = input.bio.trim();
    if (bio.length > BIO_MAX_LENGTH) {
      throw new InvalidBioError(BIO_MAX_LENGTH);
    }

    if (
      input.income !== null &&
      (!Number.isFinite(input.income) || input.income < 0)
    ) {
      throw new InvalidIncomeError();
    }

    return {
      bio,
      income: input.income,
      budget: input.budget,
      isSmoker: input.isSmoker,
      noisePreference: input.noisePreference,
      visitPreference: input.visitPreference,
      schedule: copySchedule(input.schedule),
    };
  }
}

// Cópia profunda que mantém só os dias da semana conhecidos.
function copySchedule(schedule: WeeklySchedule): WeeklySchedule {
  const copy: WeeklySchedule = {};
  for (const day of WEEKDAYS) {
    const slots = schedule[day];
    if (slots) copy[day] = [...slots];
  }
  return copy;
}
