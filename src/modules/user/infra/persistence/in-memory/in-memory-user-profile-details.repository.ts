import type { UserProfileDetails } from '../../../domain/entities/user-profile-details.entity.js';
import { UserProfileDetailsRepository } from '../../../domain/repositories/user-profile-details.repository.js';

export class InMemoryUserProfileDetailsRepository extends UserProfileDetailsRepository {
  // Público para os testes inspecionarem o que foi salvo.
  readonly items = new Map<string, UserProfileDetails>();

  findByUserId(userId: string): Promise<UserProfileDetails | null> {
    return Promise.resolve(this.items.get(userId) ?? null);
  }

  save(details: UserProfileDetails): Promise<void> {
    this.items.set(details.userId, details);
    return Promise.resolve();
  }
}
