import type { ListingStatus } from '../enums/listing-status.enum.js';

export interface OwnedListingSummary {
  listingId: string;
  propertyId: string;
  title: string;
  neighborhood: string;
  city: string;
  state: string;
  housingType: string;
  bedrooms: number;
  bathrooms: number;
  residents: number;
  rent: number;
  interestedCount: number;
  photoUrl: string | null;
  status: ListingStatus.APPROVED | ListingStatus.ARCHIVED;
}

export abstract class OwnerListingRepository {
  abstract listOwned(userId: string): Promise<OwnedListingSummary[]>;

  abstract findOwnedStatus(userId: string, listingId: string): Promise<ListingStatus | null>;

  abstract transitionOwnedStatus(
    userId: string,
    listingId: string,
    currentStatus: ListingStatus,
    nextStatus: ListingStatus,
  ): Promise<boolean>;
}
