import { IsIn } from 'class-validator';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import type { ModerationDecision } from '../../../application/use-cases/moderate-admin-listing/moderate-admin-listing.use-case.js';

export class ModerateAdminListingDto {
  @IsIn([ListingStatus.APPROVED, ListingStatus.REJECTED])
  status: ModerationDecision;
}
