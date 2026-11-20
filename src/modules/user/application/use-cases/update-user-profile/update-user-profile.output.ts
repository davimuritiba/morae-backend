import type { AccountStatus } from '../../../domain/enums/account-status.enum.js';

export interface UpdateUserProfileOutput {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  emailVerified: boolean;
  status: AccountStatus;
}
