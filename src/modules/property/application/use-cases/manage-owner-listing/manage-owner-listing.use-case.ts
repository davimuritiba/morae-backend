import type { UseCase } from '../../../../../shared/application/use-case.js';
import { InvalidListingTransitionError } from '../../../domain/errors/invalid-listing-transition.error.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import type { OwnerListingRepository } from '../../../domain/repositories/owner-listing.repository.js';

export interface ManageOwnerListingInput {
  userId: string;
  listingId: string;
  status: ListingStatus.ARCHIVED | ListingStatus.APPROVED;
}

export interface ManageOwnerListingOutput {
  listingId: string;
  status: ListingStatus.ARCHIVED | ListingStatus.APPROVED;
}

export class ManageOwnerListingUseCase
  implements UseCase<ManageOwnerListingInput, ManageOwnerListingOutput>
{
  constructor(private readonly listings: OwnerListingRepository) {}

  async execute(input: ManageOwnerListingInput): Promise<ManageOwnerListingOutput> {
    const currentStatus = await this.listings.findOwnedStatus(input.userId, input.listingId);
    if (currentStatus === null) throw new ListingNotFoundError();

    const validTransition = input.status === ListingStatus.ARCHIVED
      ? currentStatus === ListingStatus.APPROVED
      : currentStatus === ListingStatus.ARCHIVED;
    if (!validTransition) throw new InvalidListingTransitionError();

    const updated = await this.listings.transitionOwnedStatus(
      input.userId,
      input.listingId,
      currentStatus,
      input.status,
    );
    if (!updated) throw new InvalidListingTransitionError();

    return { listingId: input.listingId, status: input.status };
  }
}