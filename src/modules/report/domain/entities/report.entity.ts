import { ReportUserNotVerifiedError } from '../errors/report-user-not-verified.error.js';
import { ReportNotReviewedError } from '../errors/report-not-reviewed.error.js';

export interface ReportActorVerification {
  emailVerified: boolean;
  studentVerificationStatus: string | null;
  propertyOwnerVerificationStatus: string | null;
}

export function assertReportActorVerified(
  actor: ReportActorVerification | null,
): void {
  if (
    !actor ||
    !actor.emailVerified ||
    (actor.studentVerificationStatus !== 'VERIFIED' &&
      actor.propertyOwnerVerificationStatus !== 'VERIFIED')
  ) {
    throw new ReportUserNotVerifiedError();
  }
}

export function assertReportCanBeRemoved(status: string): void {
  if (status !== 'UNDER_REVIEW') throw new ReportNotReviewedError();
}
