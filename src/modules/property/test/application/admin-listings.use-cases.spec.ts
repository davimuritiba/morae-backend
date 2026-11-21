import { GetAdminListingUseCase } from '../../application/use-cases/get-admin-listing/get-admin-listing.use-case.js';
import { ListAdminListingsUseCase } from '../../application/use-cases/list-admin-listings/list-admin-listings.use-case.js';
import { ListingNotFoundError } from '../../domain/errors/listing-not-found.error.js';
import { AdminListingRepository } from '../../domain/repositories/admin-listing.repository.js';

describe('Admin listing use cases', () => {
  it('trims the search term before querying the repository', async () => {
    const findPage = vi.fn().mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 25,
    });
    const repository = { findPage } as unknown as AdminListingRepository;
    const useCase = new ListAdminListingsUseCase(repository);

    await useCase.execute({ search: '  Farol  ', page: 1, limit: 25 });

    expect(findPage).toHaveBeenCalledWith({
      search: 'Farol',
      status: undefined,
      page: 1,
      limit: 25,
    });
  });

  it('returns the established listing not-found domain error', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as AdminListingRepository;
    const useCase = new GetAdminListingUseCase(repository);

    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(
      ListingNotFoundError,
    );
  });
});
