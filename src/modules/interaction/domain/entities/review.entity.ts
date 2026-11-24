import { ReviewAlreadySubmittedError } from '../errors/review-already-submitted.error.js';
import { ReviewNotEligibleError } from '../errors/review-not-eligible.error.js';

export interface ReviewEligibility {
  reviewerId: string;
  tenantId: string;
  reviewedUserId: string;
  ownerId: string;
  contractStatus: string;
  startsAt: Date;
  alreadyReviewed: boolean;
}

export function assertReviewEligible(
  eligibility: ReviewEligibility,
  now: Date,
): void {
  if (
    eligibility.reviewerId !== eligibility.tenantId ||
    eligibility.reviewerId === eligibility.reviewedUserId ||
    eligibility.reviewedUserId !== eligibility.ownerId ||
    !['ACTIVE', 'TERMINATED'].includes(eligibility.contractStatus) ||
    eligibility.startsAt.getTime() > now.getTime()
  ) {
    throw new ReviewNotEligibleError();
  }

  if (eligibility.alreadyReviewed) {
    throw new ReviewAlreadySubmittedError();
  }
}