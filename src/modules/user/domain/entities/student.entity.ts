import { randomUUID } from 'node:crypto';
import { VerificationStatus } from '../../../../shared/domain/enums/verification-status.enum.js';
import { InvalidVerificationTransitionError } from '../../../../shared/domain/errors/invalid-verification-transition.error.js';
import { InvalidCourseError } from '../errors/invalid-course.error.js';
import { InvalidExpectedGraduationError } from '../errors/invalid-expected-graduation.error.js';
import type { AcademicPeriod } from '../value-objects/academic-period.vo.js';
import type { EnrollmentNumber } from '../value-objects/enrollment-number.vo.js';
import {
  StudentProfile,
  type StudentProfileInput,
} from './student-profile.entity.js';

const COURSE_MAX_LENGTH = 100;

export interface StudentProps {
  userId: string;
  enrollmentNumber: EnrollmentNumber;
  course: string;
  period: AcademicPeriod;
  expectedGraduation: Date;
  verificationStatus: VerificationStatus;
  profile: StudentProfile | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentProps {
  userId: string;
  enrollmentNumber: EnrollmentNumber;
  course: string;
  period: AcademicPeriod;
  expectedGraduation: Date;
}

export interface AcademicInfo {
  course: string;
  period: AcademicPeriod;
  expectedGraduation: Date;
}

// Student é a raiz do agregado: o StudentProfile só é criado/alterado por aqui.
export class Student {
  // Campos privados de verdade (#): serializar a entidade não expõe os dados.
  readonly #id: string;
  readonly #props: StudentProps;

  private constructor(id: string, props: StudentProps) {
    this.#id = id;
    this.#props = props;
  }

  static create(input: CreateStudentProps): Student {
    const now = new Date();

    return new Student(randomUUID(), {
      userId: input.userId,
      enrollmentNumber: input.enrollmentNumber,
      ...Student.validateAcademicInfo(input),
      verificationStatus: VerificationStatus.PENDING,
      profile: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(id: string, props: StudentProps): Student {
    return new Student(id, { ...props });
  }

  get id(): string {
    return this.#id;
  }

  get userId(): string {
    return this.#props.userId;
  }

  get enrollmentNumber(): EnrollmentNumber {
    return this.#props.enrollmentNumber;
  }

  get course(): string {
    return this.#props.course;
  }

  get period(): AcademicPeriod {
    return this.#props.period;
  }

  get expectedGraduation(): Date {
    return this.#props.expectedGraduation;
  }

  get verificationStatus(): VerificationStatus {
    return this.#props.verificationStatus;
  }

  get profile(): StudentProfile | null {
    return this.#props.profile;
  }

  get createdAt(): Date {
    return this.#props.createdAt;
  }

  get updatedAt(): Date {
    return this.#props.updatedAt;
  }

  updateAcademicInfo(input: AcademicInfo): void {
    const info = Student.validateAcademicInfo(input);
    this.#props.course = info.course;
    this.#props.period = info.period;
    this.#props.expectedGraduation = info.expectedGraduation;
    this.touch();
  }

  // Cria o perfil na primeira vez; nas seguintes, substitui pelo atualizado.
  defineProfile(input: StudentProfileInput): void {
    this.#props.profile = this.#props.profile
      ? this.#props.profile.withChanges(input)
      : StudentProfile.create(this.#id, input);
    this.touch();
  }

  verify(): void {
    this.changeVerification(
      VerificationStatus.PENDING,
      VerificationStatus.VERIFIED,
    );
  }

  reject(): void {
    this.changeVerification(
      VerificationStatus.PENDING,
      VerificationStatus.REJECTED,
    );
  }

  // Após uma rejeição, o estudante envia novo documento e volta para a fila.
  resubmitVerification(): void {
    this.changeVerification(
      VerificationStatus.REJECTED,
      VerificationStatus.PENDING,
    );
  }

  private static validateAcademicInfo(input: AcademicInfo): AcademicInfo {
    const course = input.course.trim();
    if (course.length === 0 || course.length > COURSE_MAX_LENGTH) {
      throw new InvalidCourseError(COURSE_MAX_LENGTH);
    }

    if (
      !(input.expectedGraduation instanceof Date) ||
      Number.isNaN(input.expectedGraduation.getTime())
    ) {
      throw new InvalidExpectedGraduationError();
    }

    return {
      course,
      period: input.period,
      // Cópia, para que quem passou a data não consiga alterá-la depois.
      expectedGraduation: new Date(input.expectedGraduation.getTime()),
    };
  }

  private changeVerification(
    expected: VerificationStatus,
    next: VerificationStatus,
  ): void {
    if (this.#props.verificationStatus !== expected) {
      throw new InvalidVerificationTransitionError(
        this.#props.verificationStatus,
        next,
      );
    }
    this.#props.verificationStatus = next;
    this.touch();
  }

  private touch(): void {
    this.#props.updatedAt = new Date();
  }
}
