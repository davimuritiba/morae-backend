import type { AccountStatus } from '../../../domain/enums/account-status.enum.js';
import type { AccountType } from '../../../domain/enums/account-type.enum.js';

export interface LoginOutput {
  userId: string;
  name: string;
  email: string;
  status: AccountStatus;
  accountType: AccountType;
}
