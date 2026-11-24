import type { UserProfileDetails } from '../entities/user-profile-details.entity.js';

export abstract class UserProfileDetailsRepository {
  abstract findByUserId(userId: string): Promise<UserProfileDetails | null>;
  // Cria ou substitui os dados do usuário.
  abstract save(details: UserProfileDetails): Promise<void>;
}
