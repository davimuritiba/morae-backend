import type { UseCase } from '../../../../../shared/application/use-case.js';
import type { FavoriteRepository } from '../../../domain/repositories/favorite.repository.js';

export interface RemoveFavoriteInput {
  userId: string;
  listingId: string;
}

export class RemoveFavoriteUseCase implements UseCase<RemoveFavoriteInput, void> {
  constructor(private readonly favorites: FavoriteRepository) {}

  execute(input: RemoveFavoriteInput): Promise<void> {
    return this.favorites.remove(input.userId, input.listingId);
  }
}
