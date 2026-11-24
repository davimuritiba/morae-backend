import { IsEnum } from 'class-validator';
import { InterestStatus } from '../../../domain/enums/interest-status.enum.js';

export class UpdateInterestStatusDto {
  @IsEnum({
    IN_CONVERSATION: InterestStatus.IN_CONVERSATION,
    ACCEPTED: InterestStatus.ACCEPTED,
    REJECTED: InterestStatus.REJECTED,
  })
  status!: InterestStatus;
}
