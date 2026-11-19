import type { HousingType } from '../enums/housing-type.enum.js';
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
  media: { type: MediaType; url: string; position: number }[];
  createdAt: Date;
}

export interface SearchListingsFilter {
  location?: string;
}

export abstract class ListingRepository {
  abstract search(filter: SearchListingsFilter): Promise<ListingSearchResult[]>;
}
