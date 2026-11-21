import { IsIn } from 'class-validator';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';

export class ManageOwnerListingDto {
  @IsIn([ListingStatus.ARCHIVED, ListingStatus.APPROVED])
  status!: ListingStatus.ARCHIVED | ListingStatus.APPROVED;
}