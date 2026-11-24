import { GetAdminListingUseCase } from '../../../application/use-cases/get-admin-listing/get-admin-listing.use-case.js';
import { ListAdminListingsUseCase } from '../../../application/use-cases/list-admin-listings/list-admin-listings.use-case.js';
import { ModerateAdminListingUseCase } from '../../../application/use-cases/moderate-admin-listing/moderate-admin-listing.use-case.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { InvalidListingTransitionError } from '../../../domain/errors/invalid-listing-transition.error.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import { AdminListingRepository } from '../../../domain/repositories/admin-listing.repository.js';

describe('Admin listing use cases', () => {
  it('normalizes search text before listing results', async () => {
    const findPage = vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 25 });
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

  it('returns a domain not-found error for an unknown listing', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as AdminListingRepository;
    const useCase = new GetAdminListingUseCase(repository);

    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(ListingNotFoundError);
  });

  describe('ModerateAdminListingUseCase', () => {
    function repositoryWith(status: ListingStatus, transitioned = true) {
      const findById = vi
        .fn()
        .mockResolvedValueOnce({ listingId: 'l-1', status })
        .mockResolvedValue({ listingId: 'l-1', status: 'AFTER' });
      const transitionStatus = vi.fn().mockResolvedValue(transitioned);
      const repository = {
        findById,
        transitionStatus,
      } as unknown as AdminListingRepository;
      return { repository, transitionStatus };
    }

    it.each([ListingStatus.PENDING, ListingStatus.IN_REVIEW, ListingStatus.REJECTED])(
      'aprova anúncio %s',
      async (status) => {
        const { repository, transitionStatus } = repositoryWith(status);

        await expect(
          new ModerateAdminListingUseCase(repository).execute({
            listingId: 'l-1',
            status: ListingStatus.APPROVED,
          }),
        ).resolves.toEqual({ listingId: 'l-1', status: 'AFTER' });
        expect(transitionStatus).toHaveBeenCalledWith(
          'l-1',
          [ListingStatus.PENDING, ListingStatus.IN_REVIEW, ListingStatus.REJECTED],
          ListingStatus.APPROVED,
        );
      },
    );

    it.each([
      [ListingStatus.APPROVED, ListingStatus.REJECTED],
      [ListingStatus.ARCHIVED, ListingStatus.APPROVED],
      [ListingStatus.REMOVED, ListingStatus.APPROVED],
      [ListingStatus.ARCHIVED, ListingStatus.REJECTED],
    ])('recusa levar anúncio %s para %s', async (from, to) => {
      const { repository, transitionStatus } = repositoryWith(from);

      await expect(
        new ModerateAdminListingUseCase(repository).execute({
          listingId: 'l-1',
          status: to as ListingStatus.APPROVED | ListingStatus.REJECTED,
        }),
      ).rejects.toBeInstanceOf(InvalidListingTransitionError);
      expect(transitionStatus).not.toHaveBeenCalled();
    });

    it('não grava nada quando o anúncio já está no status pedido', async () => {
      const { repository, transitionStatus } = repositoryWith(ListingStatus.APPROVED);

      await new ModerateAdminListingUseCase(repository).execute({
        listingId: 'l-1',
        status: ListingStatus.APPROVED,
      });
      expect(transitionStatus).not.toHaveBeenCalled();
    });

    it('acusa conflito quando outro moderador mudou o status antes', async () => {
      const { repository } = repositoryWith(ListingStatus.PENDING, false);

      await expect(
        new ModerateAdminListingUseCase(repository).execute({
          listingId: 'l-1',
          status: ListingStatus.REJECTED,
        }),
      ).rejects.toBeInstanceOf(InvalidListingTransitionError);
    });

    it('acusa anúncio inexistente', async () => {
      const repository = {
        findById: vi.fn().mockResolvedValue(null),
      } as unknown as AdminListingRepository;

      await expect(
        new ModerateAdminListingUseCase(repository).execute({
          listingId: 'x',
          status: ListingStatus.APPROVED,
        }),
      ).rejects.toBeInstanceOf(ListingNotFoundError);
    });
  });
});
