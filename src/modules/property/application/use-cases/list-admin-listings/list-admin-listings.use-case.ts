import type { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { AdminListingRepository } from '../../../domain/repositories/admin-listing.repository.js';

export interface ListAdminListingsInput {
  search?: string;
  status?: ListingStatus;
  page: number;
  limit: number;
}

export class ListAdminListingsUseCase {
  constructor(private readonly listings: AdminListingRepository) {}

  execute(input: ListAdminListingsInput) {
    return this.listings.findPage({
      ...input,
      search: input.search?.trim() || undefined,
    });
  }
}
