import type { UseCase } from '../../../../../shared/application/use-case.js';
import { InvalidListingTransitionError } from '../../../domain/errors/invalid-listing-transition.error.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import type { OwnerListingRepository } from '../../../domain/repositories/owner-listing.repository.js';

export interface RemoveOwnerListingInput {
  userId: string;
  listingId: string;
}

export class RemoveOwnerListingUseCase implements UseCase<RemoveOwnerListingInput, void> {
  constructor(private readonly listings: OwnerListingRepository) {}

  async execute(input: RemoveOwnerListingInput): Promise<void> {
    const currentStatus = await this.listings.findOwnedStatus(input.userId, input.listingId);
    if (currentStatus === null) throw new ListingNotFoundError();
    if (currentStatus === ListingStatus.REMOVED) return;

    const updated = await this.listings.transitionOwnedStatus(
      input.userId,
      input.listingId,
      currentStatus,
      ListingStatus.REMOVED,
    );
    if (!updated) throw new InvalidListingTransitionError();
  }
}