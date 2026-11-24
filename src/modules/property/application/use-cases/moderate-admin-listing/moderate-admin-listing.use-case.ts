import type { UseCase } from '../../../../../shared/application/use-case.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { InvalidListingTransitionError } from '../../../domain/errors/invalid-listing-transition.error.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import type {
  AdminListingRecord,
  AdminListingRepository,
} from '../../../domain/repositories/admin-listing.repository.js';

export type ModerationDecision = ListingStatus.APPROVED | ListingStatus.REJECTED;

export interface ModerateAdminListingInput {
  listingId: string;
  status: ModerationDecision;
}

// Anúncio novo nasce PENDING e só entra na busca depois de APPROVED. Um
// anúncio rejeitado pode ser reavaliado e aprovado. Tirar do ar um anúncio já
// aprovado é papel da denúncia (REMOVED) ou do próprio dono (ARCHIVED).
const ALLOWED_FROM: Record<ModerationDecision, readonly ListingStatus[]> = {
  [ListingStatus.APPROVED]: [
    ListingStatus.PENDING,
    ListingStatus.IN_REVIEW,
    ListingStatus.REJECTED,
  ],
  [ListingStatus.REJECTED]: [ListingStatus.PENDING, ListingStatus.IN_REVIEW],
};

export class ModerateAdminListingUseCase
  implements UseCase<ModerateAdminListingInput, AdminListingRecord>
{
  constructor(private readonly listings: AdminListingRepository) {}

  async execute(input: ModerateAdminListingInput): Promise<AdminListingRecord> {
    const listing = await this.listings.findById(input.listingId);
    if (!listing) throw new ListingNotFoundError();
    if (listing.status === input.status) return listing;

    const allowedFrom = ALLOWED_FROM[input.status];
    if (!allowedFrom.includes(listing.status)) {
      throw new InvalidListingTransitionError();
    }

    // A troca só acontece se o status ainda for um dos esperados: dois
    // moderadores agindo ao mesmo tempo não sobrescrevem um ao outro.
    const updated = await this.listings.transitionStatus(
      input.listingId,
      allowedFrom,
      input.status,
    );
    if (!updated) throw new InvalidListingTransitionError();

    const result = await this.listings.findById(input.listingId);
    if (!result) throw new ListingNotFoundError();
    return result;
  }
}
