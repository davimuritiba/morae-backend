import { randomUUID } from 'node:crypto';
import type { BudgetRange } from '../value-objects/budget-range.vo.js';
import type { PreferenceLevel } from '../value-objects/preference-level.vo.js';
import type { TimeSlot } from '../value-objects/time-slot.vo.js';

export type Weekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type WeeklySchedule = Partial<Record<Weekday, TimeSlot[]>>;

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

export interface CreateStudentProfileProps extends StudentProfileInput {
  studentId: string;
}

export class StudentProfile {
  private constructor(
    private readonly _id: string,
    private readonly props: StudentProfileProps,
  ) {}

  static create(input: CreateStudentProfileProps): StudentProfile {
    return new StudentProfile(randomUUID(), {
      ...input,
      updatedAt: new Date(),
    });
  }

  static restore(id: string, props: StudentProfileProps): StudentProfile {
    return new StudentProfile(id, { ...props });
  }

  get id(): string {
    return this._id;
  }

  get studentId(): string {
    return this.props.studentId;
  }

  get bio(): string {
    return this.props.bio;
  }

  get income(): number | null {
    return this.props.income;
  }

  get budget(): BudgetRange {
    return this.props.budget;
  }

  get isSmoker(): boolean {
    return this.props.isSmoker;
  }

  get noisePreference(): PreferenceLevel {
    return this.props.noisePreference;
  }

  get visitPreference(): PreferenceLevel {
    return this.props.visitPreference;
  }

  get schedule(): WeeklySchedule {
    return this.props.schedule;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  update(input: StudentProfileInput): void {
    this.props.bio = input.bio;
    this.props.income = input.income;
    this.props.budget = input.budget;
    this.props.isSmoker = input.isSmoker;
    this.props.noisePreference = input.noisePreference;
    this.props.visitPreference = input.visitPreference;
    this.props.schedule = input.schedule;
    this.props.updatedAt = new Date();
  }
}
