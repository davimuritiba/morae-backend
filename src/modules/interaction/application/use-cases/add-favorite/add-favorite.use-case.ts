import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  FavoriteReceipt,
  FavoriteRepository,
} from '../../../domain/repositories/favorite.repository.js';

export interface AddFavoriteInput {
  userId: string;
  listingId: string;
}

export class AddFavoriteUseCase implements UseCase<AddFavoriteInput, FavoriteReceipt> {
  constructor(private readonly favorites: FavoriteRepository) {}

  execute(input: AddFavoriteInput): Promise<FavoriteReceipt> {
    return this.favorites.add(input.userId, input.listingId);
  }
}
