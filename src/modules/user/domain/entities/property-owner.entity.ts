import { randomUUID } from 'node:crypto';
import { VerificationStatus } from '../../../../shared/domain/enums/verification-status.enum.js';
import { InvalidVerificationTransitionError } from '../../../../shared/domain/errors/invalid-verification-transition.error.js';

export interface PropertyOwnerProps {
  userId: string;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePropertyOwnerProps {
  userId: string;
}

export class PropertyOwner {
  private constructor(
    private readonly _id: string,
    private readonly props: PropertyOwnerProps,
  ) {}

  static create(input: CreatePropertyOwnerProps): PropertyOwner {
    const now = new Date();

    return new PropertyOwner(randomUUID(), {
      userId: input.userId,
      verificationStatus: VerificationStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(id: string, props: PropertyOwnerProps): PropertyOwner {
    return new PropertyOwner(id, { ...props });
  }

  get id(): string {
    return this._id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get verificationStatus(): VerificationStatus {
    return this.props.verificationStatus;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
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

  // Após uma rejeição, o dono envia novo documento e volta para a fila.
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
