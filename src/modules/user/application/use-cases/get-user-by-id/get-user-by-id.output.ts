import type { AccountStatus } from '../../../domain/enums/account-status.enum.js';

export interface GetUserByIdOutput {
  userId: string;
  name: string;
  email: string;
  cpf: string;
  profileData:
    import('../../../domain/entities/user.entity.js').UserProfileData | null;
  phone: string | null;
  photoUrl: string | null;
  emailVerified: boolean;
  status: AccountStatus;
}
