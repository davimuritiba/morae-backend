export interface InterestedUserView {
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  course: string | null;
  period: number | null;
  bio: string | null;
  interestedAt: Date;
}

export interface InterestReceipt {
  listingId: string;
  createdAt: Date;
}

export abstract class InterestRepository {
  abstract add(userId: string, listingId: string): Promise<InterestReceipt>;
  abstract remove(userId: string, listingId: string): Promise<void>;
  abstract listForListing(
    ownerUserId: string,
    listingId: string,
  ): Promise<InterestedUserView[]>;
}
