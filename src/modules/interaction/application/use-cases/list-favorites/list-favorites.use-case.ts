import type { UseCase } from '../../../../../shared/application/use-case.js';
import type {
  FavoriteListingView,
  FavoriteRepository,
} from '../../../domain/repositories/favorite.repository.js';

export interface ListFavoritesInput {
  userId: string;
}

export interface ListFavoritesOutput {
  items: FavoriteListingView[];
}

export class ListFavoritesUseCase implements UseCase<ListFavoritesInput, ListFavoritesOutput> {
  constructor(private readonly favorites: FavoriteRepository) {}

  async execute(input: ListFavoritesInput): Promise<ListFavoritesOutput> {
    return { items: await this.favorites.listForUser(input.userId) };
  }
}
