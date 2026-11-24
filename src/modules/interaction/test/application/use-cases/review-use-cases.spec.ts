import { SubmitReviewUseCase } from '../../../application/use-cases/submit-review/submit-review.use-case.js';
import { ListUserReviewsUseCase } from '../../../application/use-cases/list-user-reviews/list-user-reviews.use-case.js';
import { ListEligibleReviewContractsUseCase } from '../../../application/use-cases/list-eligible-review-contracts/list-eligible-review-contracts.use-case.js';
import { assertReviewEligible } from '../../../domain/entities/review.entity.js';
import { ReviewAlreadySubmittedError } from '../../../domain/errors/review-already-submitted.error.js';
import { ReviewNotEligibleError } from '../../../domain/errors/review-not-eligible.error.js';
import { Clock } from '../../../../../shared/application/clock.js';
import type {
  EligibleReviewContract,
  ReviewRepository,
  ReviewView,
  ReviewsForUser,
  SubmitReviewData,
} from '../../../domain/repositories/review.repository.js';

const TENANT_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const OWNER_ID = 'bbbbbbbb-0000-4000-8000-000000000002';
const CONTRACT_ID = 'cccccccc-0000-4000-8000-000000000003';
const NOW = new Date('2026-11-22T12:00:00.000Z');
const ratings = {
  cleanliness: 5,
  condition: 4,
  location: 5,
  communication: 4,
  value: 4,
  overall: 5,
};

class FixedClock extends Clock {
  now(): Date { return NOW; }
}

class FakeReviewRepository implements ReviewRepository {
  submitted: { reviewerId: string; data: SubmitReviewData; now: Date } | null = null;
  eligible: EligibleReviewContract[] = [];
  result: ReviewView = {
    id: 'dddddddd-0000-4000-8000-000000000004',
    reviewedUserId: OWNER_ID,
    listingId: 'eeeeeeee-0000-4000-8000-000000000005',
    listingTitle: 'Apartamento no Farol',
    ...ratings,
    comment: 'A moradia foi bem cuidada durante todo o período.',
    createdAt: NOW,
  };
  listed: ReviewsForUser = { items: [this.result], averageRating: 5, reviewCount: 1 };

  async submit(
    reviewerId: string,
    data: SubmitReviewData,
    now: Date,
  ): Promise<ReviewView> {
    this.submitted = { reviewerId, data, now };
    return this.result;
  }

  async listForUser(): Promise<ReviewsForUser> {
    return this.listed;
  }

  async listEligibleContracts(): Promise<EligibleReviewContract[]> {
    return this.eligible;
  }
}

describe('Review eligibility rules', () => {
  const eligible = {
    reviewerId: TENANT_ID,
    tenantId: TENANT_ID,
    reviewedUserId: OWNER_ID,
    ownerId: OWNER_ID,
    contractStatus: 'ACTIVE',
    startsAt: new Date('2026-11-01T00:00:00.000Z'),
    alreadyReviewed: false,
  };

  it('allows the tenant to review an active, started contract', () => {
    expect(() => assertReviewEligible(eligible, NOW)).not.toThrow();
  });

  it.each([
    { ...eligible, reviewerId: OWNER_ID },
    { ...eligible, reviewedUserId: TENANT_ID },
    { ...eligible, contractStatus: 'PENDING' },
    { ...eligible, startsAt: new Date('2026-11-23T00:00:00.000Z') },
  ])('rejects a review without an eligible lived experience', (candidate) => {
    expect(() => assertReviewEligible(candidate, NOW)).toThrow(ReviewNotEligibleError);
  });

  it('rejects a second review for the same contract', () => {
    expect(() => assertReviewEligible(
      { ...eligible, alreadyReviewed: true },
      NOW,
    )).toThrow(ReviewAlreadySubmittedError);
  });
});

describe('Review use cases', () => {
  it('submits the authenticated tenant review with the current time', async () => {
    const repository = new FakeReviewRepository();
    const clock = new FixedClock();
    const data = { contractId: CONTRACT_ID, ...ratings, comment: 'A moradia foi bem cuidada durante todo o período.' };

    await expect(
      new SubmitReviewUseCase(repository, clock).execute({ reviewerId: TENANT_ID, ...data }),
    ).resolves.toEqual(repository.result);
    expect(repository.submitted).toEqual({ reviewerId: TENANT_ID, data, now: NOW });
  });

  it('lists public reviews for the selected profile', async () => {
    const repository = new FakeReviewRepository();

    await expect(new ListUserReviewsUseCase(repository).execute(OWNER_ID))
      .resolves.toEqual(repository.listed);
  });

  it('lists contracts eligible for evaluation using the current time', async () => {
    const repository = new FakeReviewRepository();
    const clock = new FixedClock();
    const contract: EligibleReviewContract = {
      contractId: CONTRACT_ID,
      listingId: 'eeeeeeee-0000-4000-8000-000000000005',
      listingTitle: 'Apartamento no Farol',
      neighborhood: 'Farol',
      ownerId: OWNER_ID,
      ownerName: 'Anunciante',
      startsAt: '2026-11-01',
      status: 'ACTIVE',
    };
    repository.eligible = [contract];

    await expect(
      new ListEligibleReviewContractsUseCase(repository, clock).execute(TENANT_ID),
    ).resolves.toEqual([contract]);
  });
});
