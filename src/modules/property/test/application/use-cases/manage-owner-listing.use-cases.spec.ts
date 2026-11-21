import { ManageOwnerListingUseCase } from '../../../application/use-cases/manage-owner-listing/manage-owner-listing.use-case.js';
import { RemoveOwnerListingUseCase } from '../../../application/use-cases/manage-owner-listing/remove-owner-listing.use-case.js';
import { InvalidListingTransitionError } from '../../../domain/errors/invalid-listing-transition.error.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import type { OwnerListingRepository } from '../../../domain/repositories/owner-listing.repository.js';

const USER_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const LISTING_ID = 'bbbbbbbb-0000-4000-8000-000000000002';

class FakeOwnerListingRepository implements OwnerListingRepository {
  currentStatus: ListingStatus | null = ListingStatus.APPROVED;
  transitions: Array<{ from: ListingStatus; to: ListingStatus }> = [];

  async findOwnedStatus(userId: string, listingId: string): Promise<ListingStatus | null> {
    return userId === USER_ID && listingId === LISTING_ID ? this.currentStatus : null;
  }

  async transitionOwnedStatus(
    userId: string,
    listingId: string,
    currentStatus: ListingStatus,
    nextStatus: ListingStatus,
  ): Promise<boolean> {
    if (userId !== USER_ID || listingId !== LISTING_ID || currentStatus !== this.currentStatus) return false;
    this.transitions.push({ from: currentStatus, to: nextStatus });
    this.currentStatus = nextStatus;
    return true;
  }
}

describe('ManageOwnerListingUseCase', () => {
  it('arquiva anúncio aprovado', async () => {
    const repository = new FakeOwnerListingRepository();
    const result = await new ManageOwnerListingUseCase(repository).execute({
      userId: USER_ID,
      listingId: LISTING_ID,
      status: ListingStatus.ARCHIVED,
    });

    expect(result).toEqual({ listingId: LISTING_ID, status: ListingStatus.ARCHIVED });
    expect(repository.currentStatus).toBe(ListingStatus.ARCHIVED);
  });

  it('reativa anúncio arquivado', async () => {
    const repository = new FakeOwnerListingRepository();
    repository.currentStatus = ListingStatus.ARCHIVED;

    const result = await new ManageOwnerListingUseCase(repository).execute({
      userId: USER_ID,
      listingId: LISTING_ID,
      status: ListingStatus.APPROVED,
    });

    expect(result.status).toBe(ListingStatus.APPROVED);
    expect(repository.currentStatus).toBe(ListingStatus.APPROVED);
  });

  it('recusa arquivar anúncio que não está aprovado', async () => {
    const repository = new FakeOwnerListingRepository();
    repository.currentStatus = ListingStatus.IN_REVIEW;

    await expect(new ManageOwnerListingUseCase(repository).execute({
      userId: USER_ID,
      listingId: LISTING_ID,
      status: ListingStatus.ARCHIVED,
    })).rejects.toBeInstanceOf(InvalidListingTransitionError);
  });

  it('recusa alterar anúncio que não pertence ao usuário', async () => {
    const repository = new FakeOwnerListingRepository();

    await expect(new ManageOwnerListingUseCase(repository).execute({
      userId: 'cccccccc-0000-4000-8000-000000000003',
      listingId: LISTING_ID,
      status: ListingStatus.ARCHIVED,
    })).rejects.toBeInstanceOf(ListingNotFoundError);
  });
});

describe('RemoveOwnerListingUseCase', () => {
  it('desativa o anúncio sem apagar dados associados e trata repetição como sucesso', async () => {
    const repository = new FakeOwnerListingRepository();
    const useCase = new RemoveOwnerListingUseCase(repository);
    const input = { userId: USER_ID, listingId: LISTING_ID };

    await expect(useCase.execute(input)).resolves.toBeUndefined();
    expect(repository.currentStatus).toBe(ListingStatus.REMOVED);
    await expect(useCase.execute(input)).resolves.toBeUndefined();
    expect(repository.transitions).toHaveLength(1);
  });
});
