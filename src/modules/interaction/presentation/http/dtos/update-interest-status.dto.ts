import { IsIn } from 'class-validator';
import type { InterestStatus } from '../../../domain/repositories/interest.repository.js';

export class UpdateInterestStatusDto {
  @IsIn(['IN_CONVERSATION', 'ACCEPTED', 'REJECTED'])
  status!: InterestStatus;
}
