export interface FavoriteListingView {
  listingId: string;
  propertyId: string;
  title: string;
  description: string;
  rent: number;
  condominium: number | null;
  housingType: string;
  bedrooms: number;
  bathrooms: number;
  parkingSpaces: number;
  amenities: string[];
  location: { city: string; neighborhood: string; state: string };
  media: { type: string; url: string; position: number }[];
  favoritedAt: Date;
}

export interface FavoriteReceipt {
  listingId: string;
  createdAt: Date;
}

export abstract class FavoriteRepository {
  abstract listForUser(userId: string): Promise<FavoriteListingView[]>;
  abstract add(userId: string, listingId: string): Promise<FavoriteReceipt>;
  abstract remove(userId: string, listingId: string): Promise<void>;
}
