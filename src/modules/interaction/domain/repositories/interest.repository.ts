import type { InterestStatus } from '../enums/interest-status.enum.js';

export interface InterestedUserView {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  course: string | null;
  period: number | null;
  bio: string | null;
  status: InterestStatus;
  interestedAt: Date;
  updatedAt: Date;
}

export interface InterestReceipt {
  listingId: string;
  status: InterestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MyInterestView {
  listingId: string;
  status: InterestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceivedInterestView extends InterestedUserView {
  listingId: string;
  listingTitle: string;
  neighborhood: string;
  city: string;
}

export abstract class InterestRepository {
  abstract add(userId: string, listingId: string): Promise<InterestReceipt>;
  abstract remove(userId: string, listingId: string): Promise<void>;
  abstract findForUser(userId: string, listingId: string): Promise<MyInterestView | null>;
  abstract listForListing(
    ownerUserId: string,
    listingId: string,
  ): Promise<InterestedUserView[]>;
  abstract listForOwner(ownerUserId: string): Promise<ReceivedInterestView[]>;
  abstract updateStatus(
    ownerUserId: string,
    listingId: string,
    interestedUserId: string,
    status: InterestStatus,
  ): Promise<InterestReceipt>;
}
