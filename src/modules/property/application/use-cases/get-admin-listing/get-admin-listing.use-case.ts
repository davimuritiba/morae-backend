import { AdminListingRepository } from '../../../domain/repositories/admin-listing.repository.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';

export class GetAdminListingUseCase {
  constructor(private readonly listings: AdminListingRepository) {}

  async execute(listingId: string) {
    const listing = await this.listings.findById(listingId);
    if (!listing) {
      throw new ListingNotFoundError();
    }
    return listing;
  }
}
