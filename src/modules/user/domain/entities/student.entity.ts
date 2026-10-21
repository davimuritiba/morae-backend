import { randomUUID } from 'node:crypto';
import { VerificationStatus } from '../../../../shared/domain/enums/verification-status.enum.js';
import { InvalidVerificationTransitionError } from '../../../../shared/domain/errors/invalid-verification-transition.error.js';
import type { AcademicPeriod } from '../value-objects/academic-period.vo.js';
import type { EnrollmentNumber } from '../value-objects/enrollment-number.vo.js';
import {
  StudentProfile,
  type StudentProfileInput,
} from './student-profile.entity.js';

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
  private constructor(
    private readonly _id: string,
    private readonly props: StudentProps,
  ) {}

  static create(input: CreateStudentProps): Student {
    const now = new Date();

    return new Student(randomUUID(), {
      userId: input.userId,
      enrollmentNumber: input.enrollmentNumber,
      course: input.course,
      period: input.period,
      expectedGraduation: input.expectedGraduation,
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
    return this._id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get enrollmentNumber(): EnrollmentNumber {
    return this.props.enrollmentNumber;
  }

  get course(): string {
    return this.props.course;
  }

  get period(): AcademicPeriod {
    return this.props.period;
  }

  get expectedGraduation(): Date {
    return this.props.expectedGraduation;
  }

  get verificationStatus(): VerificationStatus {
    return this.props.verificationStatus;
  }

  get profile(): StudentProfile | null {
    return this.props.profile;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateAcademicInfo(input: AcademicInfo): void {
    this.props.course = input.course;
    this.props.period = input.period;
    this.props.expectedGraduation = input.expectedGraduation;
    this.touch();
  }

  // Cria o perfil na primeira vez; nas seguintes, atualiza o existente.
  defineProfile(input: StudentProfileInput): void {
    if (this.props.profile) {
      this.props.profile.update(input);
    } else {
      this.props.profile = StudentProfile.create({
        studentId: this._id,
        ...input,
      });
    }
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

  private changeVerification(
    expected: VerificationStatus,
    next: VerificationStatus,
  ): void {
    if (this.props.verificationStatus !== expected) {
      throw new InvalidVerificationTransitionError(
        this.props.verificationStatus,
        next,
      );
    }
    this.props.verificationStatus = next;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
