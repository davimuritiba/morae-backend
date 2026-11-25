import { IsIn } from 'class-validator';
import type { InterestStatus } from '../../../domain/enums/interest-status.enum.js';

export class UpdateInterestStatusDto {
  @IsIn(['IN_CONVERSATION', 'ACCEPTED', 'REJECTED'])
  status!: InterestStatus;
}
