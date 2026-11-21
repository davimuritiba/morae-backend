import type { UseCase } from '../../../../../shared/application/use-case.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import type {
  ListingRepository,
  ListingSearchResult,
} from '../../../domain/repositories/listing.repository.js';

export interface GetListingInput {
  listingId: string;
}

export class GetListingUseCase implements UseCase<GetListingInput, ListingSearchResult> {
  constructor(private readonly listings: ListingRepository) {}

  async execute(input: GetListingInput): Promise<ListingSearchResult> {
    const listing = await this.listings.findApprovedById(input.listingId);
    if (!listing) throw new ListingNotFoundError();
    return listing;
  }
}
