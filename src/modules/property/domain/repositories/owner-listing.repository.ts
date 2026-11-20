import type { ListingStatus } from '../enums/listing-status.enum.js';

export abstract class OwnerListingRepository {
  abstract findOwnedStatus(userId: string, listingId: string): Promise<ListingStatus | null>;

  abstract transitionOwnedStatus(
    userId: string,
    listingId: string,
    currentStatus: ListingStatus,
    nextStatus: ListingStatus,
  ): Promise<boolean>;
}