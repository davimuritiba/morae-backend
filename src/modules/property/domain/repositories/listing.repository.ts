import type { HousingType } from '../enums/housing-type.enum.js';
import type { ListingStatus } from '../enums/listing-status.enum.js';
import type { MediaType } from '../enums/media-type.enum.js';

export interface ListingSearchResult {
  listingId: string;
  propertyId: string;
  title: string;
  description: string;
  rent: number;
  condominium: number | null;
  housingType: HousingType;
  bedrooms: number;
  bathrooms: number;
  parkingSpaces: number;
  amenities: string[];
  location: { city: string; neighborhood: string; state: string };
  advertiser: { userId: string; name: string };
  media: { id: string; type: MediaType; url: string; position: number }[];
  createdAt: Date;
}

export interface OwnedListingResult extends ListingSearchResult {
  status: ListingStatus;
}

export interface SearchListingsFilter {
  location?: string;
  maxRent?: number;
  housingType?: HousingType;
  minBedrooms?: number;
  sortBy?: ListingSortBy;
}

export enum ListingSortBy {
  NEWEST = 'newest',
  RENT_ASC = 'rent_asc',
  RENT_DESC = 'rent_desc',
}

export abstract class ListingRepository {
  abstract search(filter: SearchListingsFilter): Promise<ListingSearchResult[]>;
  abstract findApprovedById(listingId: string): Promise<ListingSearchResult | null>;
  abstract findOwnedByUserId(userId: string): Promise<OwnedListingResult[]>;
}
