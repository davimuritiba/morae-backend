import { randomUUID } from 'node:crypto';
import { VerificationStatus } from '../../../../shared/domain/enums/verification-status.enum.js';
import {
  StudentProfile,
  type StudentProfileInput,
} from './student-profile.entity.js';

export interface StudentProps {
  userId: string;
  enrollmentNumber: string;
  course: string;
  period: number;
  expectedGraduation: Date;
  verificationStatus: VerificationStatus;
  profile: StudentProfile | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudentProps {
  userId: string;
  enrollmentNumber: string;
  course: string;
  period: number;
  expectedGraduation: Date;
}

export interface AcademicInfo {
  course: string;
  period: number;
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

  get enrollmentNumber(): string {
    return this.props.enrollmentNumber;
  }

  get course(): string {
    return this.props.course;
  }

  get period(): number {
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
    this.props.verificationStatus = VerificationStatus.VERIFIED;
    this.touch();
  }

  reject(): void {
    this.props.verificationStatus = VerificationStatus.REJECTED;
    this.touch();
  }

  private touch(): void {
    this.props.updatedAt = new Date();
  }
}
