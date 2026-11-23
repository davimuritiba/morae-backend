import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { rethrowUniqueViolation } from '../../../../../shared/infra/database/prisma-errors.js';
import { assertReviewEligible } from '../../../domain/entities/review.entity.js';
import { ReviewAlreadySubmittedError } from '../../../domain/errors/review-already-submitted.error.js';
import { ReviewNotEligibleError } from '../../../domain/errors/review-not-eligible.error.js';
import { ReviewTargetNotFoundError } from '../../../domain/errors/review-target-not-found.error.js';
import { ReviewRepository } from '../../../domain/repositories/review.repository.js';
import type {
  EligibleReviewContract,
  ReviewView,
  ReviewsForUser,
  SubmitReviewData,
} from '../../../domain/repositories/review.repository.js';

const reviewInclude = {
  contract: {
    select: {
      listingId: true,
      listing: { select: { title: true } },
    },
  },
} satisfies Prisma.ReviewInclude;

type ReviewWithDetails = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

function eligibleContractStatus(status: string): 'ACTIVE' | 'TERMINATED' {
  if (status === 'ACTIVE' || status === 'TERMINATED') return status;
  throw new Error(`Unexpected contract status in eligible review results: ${status}`);
}

function mapReview(review: ReviewWithDetails): ReviewView {
  return {
    id: review.id,
    reviewedUserId: review.reviewedUserId,
    listingId: review.contract.listingId,
    listingTitle: review.contract.listing.title,
    cleanliness: review.cleanliness,
    condition: review.condition,
    location: review.location,
    communication: review.communication,
    value: review.value,
    overall: review.overall,
    comment: review.comment,
    createdAt: review.createdAt,
  };
}

@Injectable()
export class PrismaReviewRepository extends ReviewRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async submit(
    reviewerId: string,
    data: SubmitReviewData,
    now: Date,
  ): Promise<ReviewView> {
    const contract = await this.prisma.rentalContract.findFirst({
      where: { id: data.contractId, tenantId: reviewerId },
      select: {
        id: true,
        tenantId: true,
        ownerId: true,
        status: true,
        startsAt: true,
        review: { select: { id: true } },
      },
    });

    if (!contract) throw new ReviewNotEligibleError();
    assertReviewEligible(
      {
        reviewerId,
        tenantId: contract.tenantId,
        reviewedUserId: contract.ownerId,
        ownerId: contract.ownerId,
        contractStatus: contract.status,
        startsAt: contract.startsAt,
        alreadyReviewed: Boolean(contract.review),
      },
      now,
    );

    try {
      const review = await this.prisma.review.create({
        data: {
          id: randomUUID(),
          contractId: contract.id,
          reviewerId,
          reviewedUserId: contract.ownerId,
          cleanliness: data.cleanliness,
          condition: data.condition,
          location: data.location,
          communication: data.communication,
          value: data.value,
          overall: data.overall,
          comment: data.comment.trim(),
        },
        include: reviewInclude,
      });
      return mapReview(review);
    } catch (error) {
      return rethrowUniqueViolation(error, {
        reviews_contract_id_key: () => new ReviewAlreadySubmittedError(),
      });
    }
  }

  async listForUser(reviewedUserId: string): Promise<ReviewsForUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: reviewedUserId, status: { not: 'DEACTIVATED' } },
      select: { id: true },
    });
    if (!user) throw new ReviewTargetNotFoundError();

    const rows = await this.prisma.review.findMany({
      where: { reviewedUserId },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
    });
    const items = rows.map(mapReview);
    const average = items.length
      ? items.reduce((total, review) => total + review.overall, 0) / items.length
      : null;

    return {
      items,
      averageRating: average === null ? null : Math.round(average * 10) / 10,
      reviewCount: items.length,
    };
  }

  async listEligibleContracts(
    tenantId: string,
    now: Date,
  ): Promise<EligibleReviewContract[]> {
    const contracts = await this.prisma.rentalContract.findMany({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'TERMINATED'] },
        startsAt: { lte: now },
        review: { is: null },
      },
      include: {
        owner: { select: { name: true } },
        listing: {
          select: {
            id: true,
            title: true,
            property: { select: { residence: { select: { neighborhood: true } } } },
          },
        },
      },
      orderBy: { startsAt: 'desc' },
    });

    return contracts.map((contract) => ({
      contractId: contract.id,
      listingId: contract.listing.id,
      listingTitle: contract.listing.title,
      neighborhood: contract.listing.property.residence.neighborhood,
      ownerId: contract.ownerId,
      ownerName: contract.owner.name,
      startsAt: contract.startsAt.toISOString().slice(0, 10),
      status: eligibleContractStatus(contract.status),
    }));
  }
}
