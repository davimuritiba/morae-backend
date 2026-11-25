import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  ListingRepository,
  SearchListingsFilter,
  ListingSearchResult,
} from '../../../domain/repositories/listing.repository.js';

export class SearchListingsUseCase implements UseCase<SearchListingsFilter, ListingSearchResult[]> {
  constructor(private readonly listings: ListingRepository) {}

  execute(input: SearchListingsFilter): Promise<ListingSearchResult[]> {
    return this.listings.search({
      ...input,
      location: input.location?.trim() || undefined,
    });
  }
}

export class GetOwnedListingsUseCase {
  constructor(private readonly listings: ListingRepository) {}

  execute(userId: string) {
    return this.listings.findOwnedByUserId(userId);
  }
}
