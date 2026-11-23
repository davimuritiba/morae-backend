import { GetMyInterestUseCase } from '../../../application/use-cases/get-my-interest/get-my-interest.use-case.js';
import { ListReceivedInterestsUseCase } from '../../../application/use-cases/list-received-interests/list-received-interests.use-case.js';
import { UpdateInterestStatusUseCase } from '../../../application/use-cases/update-interest-status/update-interest-status.use-case.js';
import { InvalidInterestTransitionError } from '../../../domain/errors/invalid-interest-transition.error.js';
import {
  canOwnerTransitionInterestStatus,
  InterestStatus,
} from '../../../domain/enums/interest-status.enum.js';
import type {
  InterestReceipt,
  InterestRepository,
  MyInterestView,
  ReceivedInterestView,
} from '../../../domain/repositories/interest.repository.js';

const OWNER_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const USER_ID = 'bbbbbbbb-0000-4000-8000-000000000002';
const LISTING_ID = 'cccccccc-0000-4000-8000-000000000003';
const NOW = new Date('2026-12-04T12:00:00.000Z');

class FakeInterestRepository implements InterestRepository {
  readonly statusChanges: Array<{
    ownerUserId: string;
    listingId: string;
    interestedUserId: string;
    status: InterestStatus;
  }> = [];
  interest: MyInterestView | null = {
    listingId: LISTING_ID,
    status: InterestStatus.PENDING,
    createdAt: NOW,
    updatedAt: NOW,
  };
  received: ReceivedInterestView[] = [];

  async add(): Promise<InterestReceipt> {
    return { listingId: LISTING_ID, status: InterestStatus.PENDING, createdAt: NOW, updatedAt: NOW };
  }

  async remove(): Promise<void> {}

  async findForUser(): Promise<MyInterestView | null> {
    return this.interest;
  }

  async listForListing(): Promise<[]> {
    return [];
  }

  async listForOwner(): Promise<ReceivedInterestView[]> {
    return this.received;
  }

  async updateStatus(
    ownerUserId: string,
    listingId: string,
    interestedUserId: string,
    status: InterestStatus,
  ): Promise<InterestReceipt> {
    this.statusChanges.push({ ownerUserId, listingId, interestedUserId, status });
    return { listingId, status, createdAt: NOW, updatedAt: NOW };
  }
}

describe('Interest use cases', () => {
  it.each([
    [InterestStatus.PENDING, InterestStatus.IN_CONVERSATION, true],
    [InterestStatus.PENDING, InterestStatus.ACCEPTED, true],
    [InterestStatus.IN_CONVERSATION, InterestStatus.REJECTED, true],
    [InterestStatus.ACCEPTED, InterestStatus.REJECTED, false],
    [InterestStatus.WITHDRAWN, InterestStatus.ACCEPTED, false],
    [InterestStatus.PENDING, InterestStatus.WITHDRAWN, false],
  ])('validates owner transition %s → %s', (from, to, allowed) => {
    expect(canOwnerTransitionInterestStatus(from, to)).toBe(allowed);
  });

  it('returns the authenticated user interest status for a listing', async () => {
    const repository = new FakeInterestRepository();

    await expect(
      new GetMyInterestUseCase(repository).execute({ userId: USER_ID, listingId: LISTING_ID }),
    ).resolves.toEqual(repository.interest);
  });

  it('lists received interests for the authenticated owner', async () => {
    const repository = new FakeInterestRepository();
    const item = { listingId: LISTING_ID, userId: USER_ID } as ReceivedInterestView;
    repository.received = [item];

    await expect(
      new ListReceivedInterestsUseCase(repository).execute({ ownerUserId: OWNER_ID }),
    ).resolves.toEqual({ items: [item] });
  });

  it('updates interest to an owner-managed status', async () => {
    const repository = new FakeInterestRepository();

    await new UpdateInterestStatusUseCase(repository).execute({
      ownerUserId: OWNER_ID,
      listingId: LISTING_ID,
      interestedUserId: USER_ID,
      status: InterestStatus.IN_CONVERSATION,
    });

    expect(repository.statusChanges).toEqual([{
      ownerUserId: OWNER_ID,
      listingId: LISTING_ID,
      interestedUserId: USER_ID,
      status: InterestStatus.IN_CONVERSATION,
    }]);
  });

  it('rejects statuses that only the interested user can set', async () => {
    const repository = new FakeInterestRepository();

    expect(() => new UpdateInterestStatusUseCase(repository).execute({
        ownerUserId: OWNER_ID,
        listingId: LISTING_ID,
        interestedUserId: USER_ID,
        status: InterestStatus.WITHDRAWN,
    })).toThrow(InvalidInterestTransitionError);
    expect(repository.statusChanges).toEqual([]);
  });
});
