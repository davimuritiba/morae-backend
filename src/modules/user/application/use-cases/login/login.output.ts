import type { AccountStatus } from '../../../domain/enums/account-status.enum.js';

export interface LoginOutput {
  userId: string;
  name: string;
  email: string;
  status: AccountStatus;
}
