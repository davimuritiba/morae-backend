export interface ReviewRatings {
  cleanliness: number;
  condition: number;
  location: number;
  communication: number;
  value: number;
  overall: number;
}

export interface SubmitReviewData extends ReviewRatings {
  contractId: string;
  comment: string;
}

export interface ReviewView extends ReviewRatings {
  id: string;
  reviewedUserId: string;
  listingId: string;
  listingTitle: string;
  comment: string;
  createdAt: Date;
}

export interface EligibleReviewContract {
  contractId: string;
  listingId: string;
  listingTitle: string;
  neighborhood: string;
  ownerId: string;
  ownerName: string;
  startsAt: string;
  status: 'ACTIVE' | 'TERMINATED';
}

export interface ReviewsForUser {
  items: ReviewView[];
  averageRating: number | null;
  reviewCount: number;
}

export abstract class ReviewRepository {
  abstract submit(
    reviewerId: string,
    data: SubmitReviewData,
    now: Date,
  ): Promise<ReviewView>;
  abstract listForUser(reviewedUserId: string): Promise<ReviewsForUser>;
  abstract listEligibleContracts(
    tenantId: string,
    now: Date,
  ): Promise<EligibleReviewContract[]>;
}