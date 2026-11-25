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

export type InterestStatus =
  | 'PENDING'
  | 'IN_CONVERSATION'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface ReceivedInterestView {
  userId: string;
  listingId: string;
  listingTitle: string;
  neighborhood: string;
  city: string;
  name: string;
  email: string;
  phone: string | null;
  course: string | null;
  period: number | null;
  status: InterestStatus;
  interestedAt: Date;
}

export interface InterestReceipt {
  listingId: string;
  status: InterestStatus;
  createdAt: Date;
  updatedAt: Date;
<<<<<<< HEAD
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
=======
>>>>>>> d7b741c (fix(interests): listar manifestações para anunciantes)
}

export abstract class InterestRepository {
  abstract add(userId: string, listingId: string): Promise<InterestReceipt>;
  abstract remove(userId: string, listingId: string): Promise<void>;
  abstract findForUser(userId: string, listingId: string): Promise<MyInterestView | null>;
  abstract listForListing(
    ownerUserId: string,
    listingId: string,
  ): Promise<InterestedUserView[]>;
<<<<<<< HEAD
  abstract listForOwner(ownerUserId: string): Promise<ReceivedInterestView[]>;
=======
  abstract listReceived(ownerUserId: string): Promise<ReceivedInterestView[]>;
>>>>>>> d7b741c (fix(interests): listar manifestações para anunciantes)
  abstract updateStatus(
    ownerUserId: string,
    listingId: string,
    interestedUserId: string,
    status: InterestStatus,
  ): Promise<InterestReceipt>;
}
