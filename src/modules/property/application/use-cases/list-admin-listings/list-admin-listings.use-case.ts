import type { UseCase } from '../../../../../shared/application/use-case.js';
import type { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import type {
  AdminListingPage,
  AdminListingRepository,
} from '../../../domain/repositories/admin-listing.repository.js';

export interface ListAdminListingsInput {
  search?: string;
  status?: ListingStatus;
  page: number;
  limit: number;
}

export class ListAdminListingsUseCase
  implements UseCase<ListAdminListingsInput, AdminListingPage>
{
  constructor(private readonly listings: AdminListingRepository) {}

  execute(input: ListAdminListingsInput): Promise<AdminListingPage> {
    return this.listings.findPage({
      ...input,
      search: input.search?.trim() || undefined,
    });
  }
}
