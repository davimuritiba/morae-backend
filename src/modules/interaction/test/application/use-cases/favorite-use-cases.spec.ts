import { AddFavoriteUseCase } from '../../../application/use-cases/add-favorite/add-favorite.use-case.js';
import { ListFavoritesUseCase } from '../../../application/use-cases/list-favorites/list-favorites.use-case.js';
import { RemoveFavoriteUseCase } from '../../../application/use-cases/remove-favorite/remove-favorite.use-case.js';
import type {
  FavoriteListingView,
  FavoriteRepository,
  FavoriteReceipt,
} from '../../../domain/repositories/favorite.repository.js';

const USER_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const LISTING_ID = 'bbbbbbbb-0000-4000-8000-000000000002';
const FAVORITED_AT = new Date('2026-11-19T12:00:00.000Z');

class FakeFavoriteRepository implements FavoriteRepository {
  readonly listedFor: string[] = [];
  readonly added: Array<{ userId: string; listingId: string }> = [];
  readonly removed: Array<{ userId: string; listingId: string }> = [];
  items: FavoriteListingView[] = [];

  async listForUser(userId: string): Promise<FavoriteListingView[]> {
    this.listedFor.push(userId);
    return this.items;
  }

  async add(userId: string, listingId: string): Promise<FavoriteReceipt> {
    this.added.push({ userId, listingId });
    return { listingId, createdAt: FAVORITED_AT };
  }

  async remove(userId: string, listingId: string): Promise<void> {
    this.removed.push({ userId, listingId });
  }
}

describe('Favorite use cases', () => {
  it('lista os favoritos da conta informada', async () => {
    const repository = new FakeFavoriteRepository();
    const item = { listingId: LISTING_ID } as FavoriteListingView;
    repository.items = [item];

    const result = await new ListFavoritesUseCase(repository).execute({ userId: USER_ID });

    expect(repository.listedFor).toEqual([USER_ID]);
    expect(result).toEqual({ items: [item] });
  });

  it('adiciona o anúncio aos favoritos da conta', async () => {
    const repository = new FakeFavoriteRepository();

    const result = await new AddFavoriteUseCase(repository).execute({
      userId: USER_ID,
      listingId: LISTING_ID,
    });

    expect(repository.added).toEqual([{ userId: USER_ID, listingId: LISTING_ID }]);
    expect(result).toEqual({ listingId: LISTING_ID, createdAt: FAVORITED_AT });
  });

  it('remove o anúncio dos favoritos da conta', async () => {
    const repository = new FakeFavoriteRepository();

    await new RemoveFavoriteUseCase(repository).execute({
      userId: USER_ID,
      listingId: LISTING_ID,
    });

    expect(repository.removed).toEqual([{ userId: USER_ID, listingId: LISTING_ID }]);
  });
});
