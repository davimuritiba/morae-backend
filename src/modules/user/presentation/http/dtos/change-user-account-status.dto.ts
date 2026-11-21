import { IsEnum } from 'class-validator';
import { AccountStatus } from '../../../domain/enums/account-status.enum.js';

export class ChangeUserAccountStatusDto {
  @IsEnum(AccountStatus)
  status: AccountStatus;
}
