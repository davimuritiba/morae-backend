import type { UseCase } from '../../../../../shared/application/use-case.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import type {
  AdminListingRecord,
  AdminListingRepository,
} from '../../../domain/repositories/admin-listing.repository.js';

export class GetAdminListingUseCase
  implements UseCase<string, AdminListingRecord>
{
  constructor(private readonly listings: AdminListingRepository) {}

  async execute(listingId: string): Promise<AdminListingRecord> {
    const listing = await this.listings.findById(listingId);
    if (!listing) throw new ListingNotFoundError();
    return listing;
  }
}
