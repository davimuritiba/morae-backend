import type { ListingStatus } from '../enums/listing-status.enum.js';

export interface AdminListingRecord {
  listingId: string;
  propertyId: string;
  title: string;
  description: string;
  rules: string | null;
  rent: number;
  condominium: number | null;
  contractType: string;
  minimumStay: string;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
  property: {
    housingType: string;
    bedrooms: number;
    bathrooms: number;
    parkingSpaces: number;
    amenities: string[];
    residence: {
      postalCode: string;
      state: string;
      street: string;
      number: string;
      complement: string | null;
      city: string;
      neighborhood: string;
    };
    owner: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
    };
  };
  media: {
    id: string;
    type: string;
    url: string;
    position: number;
  }[];
}

export interface AdminListingQuery {
  search?: string;
  status?: ListingStatus;
  page: number;
  limit: number;
}

export interface AdminListingPage {
  items: AdminListingRecord[];
  total: number;
  page: number;
  limit: number;
}

export abstract class AdminListingRepository {
  abstract findPage(query: AdminListingQuery): Promise<AdminListingPage>;
  abstract findById(listingId: string): Promise<AdminListingRecord | null>;
}
