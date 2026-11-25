import { Injectable } from '@nestjs/common';
import {
  InterestStatus as PrismaInterestStatus,
  ListingStatus,
} from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { InterestAccessDeniedError } from '../../../domain/errors/interest-access-denied.error.js';
import { InterestNotFoundError } from '../../../domain/errors/interest-not-found.error.js';
<<<<<<< HEAD
import { InterestSelfActionDeniedError } from '../../../domain/errors/interest-self-action-denied.error.js';
import { InvalidInterestTransitionError } from '../../../domain/errors/invalid-interest-transition.error.js';
import {
  canOwnerTransitionInterestStatus,
  InterestStatus,
} from '../../../domain/enums/interest-status.enum.js';
=======
>>>>>>> d7b741c (fix(interests): listar manifestações para anunciantes)
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import { InterestRepository } from '../../../domain/repositories/interest.repository.js';
import type {
  InterestedUserView,
  InterestReceipt,
<<<<<<< HEAD
  MyInterestView,
=======
  InterestStatus,
>>>>>>> d7b741c (fix(interests): listar manifestações para anunciantes)
  ReceivedInterestView,
} from '../../../domain/repositories/interest.repository.js';

function mapInterestStatus(status: PrismaInterestStatus): InterestStatus {
  switch (status) {
    case PrismaInterestStatus.PENDING:
      return InterestStatus.PENDING;
    case PrismaInterestStatus.IN_CONVERSATION:
      return InterestStatus.IN_CONVERSATION;
    case PrismaInterestStatus.ACCEPTED:
      return InterestStatus.ACCEPTED;
    case PrismaInterestStatus.REJECTED:
      return InterestStatus.REJECTED;
    case PrismaInterestStatus.WITHDRAWN:
      return InterestStatus.WITHDRAWN;
    default:
      throw new Error(`Unknown Prisma interest status: ${String(status)}`);
  }
}

function toPrismaInterestStatus(status: InterestStatus): PrismaInterestStatus {
  switch (status) {
    case InterestStatus.PENDING:
      return PrismaInterestStatus.PENDING;
    case InterestStatus.IN_CONVERSATION:
      return PrismaInterestStatus.IN_CONVERSATION;
    case InterestStatus.ACCEPTED:
      return PrismaInterestStatus.ACCEPTED;
    case InterestStatus.REJECTED:
      return PrismaInterestStatus.REJECTED;
    case InterestStatus.WITHDRAWN:
      return PrismaInterestStatus.WITHDRAWN;
    default:
      throw new Error(`Unknown domain interest status: ${String(status)}`);
  }
}

function mapInterestReceipt(
  receipt: { listingId: string; status: PrismaInterestStatus; createdAt: Date; updatedAt: Date },
): InterestReceipt {
  return { ...receipt, status: mapInterestStatus(receipt.status) };
}

@Injectable()
export class PrismaInterestRepository extends InterestRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async add(userId: string, listingId: string): Promise<InterestReceipt> {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, status: ListingStatus.APPROVED },
      select: { id: true, property: { select: { owner: { select: { userId: true } } } } },
    });
    if (!listing) throw new ListingNotFoundError();
    if (listing.property.owner.userId === userId) {
      throw new InterestSelfActionDeniedError();
    }

<<<<<<< HEAD
    const receipt = await this.prisma.$transaction(async (transaction) => {
      const interest = await transaction.interest.upsert({
        where: { userId_listingId: { userId, listingId } },
        create: { userId, listingId },
        update: {},
        select: { status: true },
      });

      if (interest.status === PrismaInterestStatus.WITHDRAWN) {
        await transaction.interest.update({
          where: { userId_listingId: { userId, listingId } },
          data: { status: PrismaInterestStatus.PENDING },
        });
      }

      return transaction.interest.findUniqueOrThrow({
        where: { userId_listingId: { userId, listingId } },
        select: { listingId: true, status: true, createdAt: true, updatedAt: true },
      });
=======
    const now = new Date();
    return this.prisma.interest.upsert({
      where: { userId_listingId: { userId, listingId } },
      create: { userId, listingId, status: PrismaInterestStatus.PENDING, updatedAt: now },
      update: { status: PrismaInterestStatus.PENDING, createdAt: now, updatedAt: now },
      select: { listingId: true, status: true, createdAt: true, updatedAt: true },
>>>>>>> d7b741c (fix(interests): listar manifestações para anunciantes)
    });
    return mapInterestReceipt(receipt);
  }

  async remove(userId: string, listingId: string): Promise<void> {
    await this.prisma.interest.updateMany({
<<<<<<< HEAD
      where: { userId, listingId, status: { not: PrismaInterestStatus.WITHDRAWN } },
      data: { status: PrismaInterestStatus.WITHDRAWN },
    });
  }

  async findForUser(userId: string, listingId: string): Promise<MyInterestView | null> {
    const interest = await this.prisma.interest.findUnique({
      where: { userId_listingId: { userId, listingId } },
      select: { listingId: true, status: true, createdAt: true, updatedAt: true },
    });
    return interest
      ? { ...interest, status: mapInterestStatus(interest.status) }
      : null;
=======
      where: { userId, listingId },
      data: { status: PrismaInterestStatus.WITHDRAWN, updatedAt: new Date() },
    });
>>>>>>> d7b741c (fix(interests): listar manifestações para anunciantes)
  }

  async listForListing(
    ownerUserId: string,
    listingId: string,
  ): Promise<InterestedUserView[]> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { property: { select: { owner: { select: { userId: true } } } } },
    });
    if (!listing) throw new ListingNotFoundError();
    if (listing.property.owner.userId !== ownerUserId) {
      throw new InterestAccessDeniedError();
    }

    const interests = await this.prisma.interest.findMany({
      where: { listingId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photoUrl: true,
            student: {
              select: {
                course: true,
                period: true,
                profile: { select: { bio: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return interests.map(({ user, status, createdAt, updatedAt }) => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photoUrl: user.photoUrl,
      course: user.student?.course ?? null,
      period: user.student?.period ?? null,
      bio: user.student?.profile?.bio ?? null,
      status: mapInterestStatus(status),
      interestedAt: createdAt,
      updatedAt,
    }));
  }

  async listForOwner(ownerUserId: string): Promise<ReceivedInterestView[]> {
    const interests = await this.prisma.interest.findMany({
      where: { listing: { property: { owner: { userId: ownerUserId } } } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photoUrl: true,
            student: {
              select: {
                course: true,
                period: true,
                profile: { select: { bio: true } },
              },
            },
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            property: {
              select: { residence: { select: { neighborhood: true, city: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return interests.map(({ user, listing, status, createdAt, updatedAt }) => ({
      userId: user.id,
      listingId: listing.id,
      listingTitle: listing.title,
      neighborhood: listing.property.residence.neighborhood,
      city: listing.property.residence.city,
      name: user.name,
      email: user.email,
      phone: user.phone,
      photoUrl: user.photoUrl,
      course: user.student?.course ?? null,
      period: user.student?.period ?? null,
      bio: user.student?.profile?.bio ?? null,
      status: mapInterestStatus(status),
      interestedAt: createdAt,
      updatedAt,
    }));
  }

  async updateStatus(
    ownerUserId: string,
    listingId: string,
    interestedUserId: string,
    status: InterestStatus,
  ): Promise<InterestReceipt> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { property: { select: { owner: { select: { userId: true } } } } },
    });
    if (!listing) throw new ListingNotFoundError();
    if (listing.property.owner.userId !== ownerUserId) {
      throw new InterestAccessDeniedError();
    }

    const where = {
      userId_listingId: { userId: interestedUserId, listingId },
    };
    const existing = await this.prisma.interest.findUnique({
      where,
      select: { status: true },
    });
    if (!existing) throw new InterestNotFoundError();

    const currentStatus = mapInterestStatus(existing.status);
    if (currentStatus === status) {
      const receipt = await this.prisma.interest.findUniqueOrThrow({
        where,
        select: { listingId: true, status: true, createdAt: true, updatedAt: true },
      });
      return mapInterestReceipt(receipt);
    }

    if (!canOwnerTransitionInterestStatus(currentStatus, status)) {
      throw new InvalidInterestTransitionError(currentStatus, status);
    }

    const changed = await this.prisma.interest.updateMany({
      where: {
        userId: interestedUserId,
        listingId,
        status: toPrismaInterestStatus(currentStatus),
      },
      data: { status: toPrismaInterestStatus(status) },
    });
    if (changed.count === 0) {
      const latest = await this.prisma.interest.findUnique({
        where,
        select: { status: true },
      });
      if (!latest) throw new InterestNotFoundError();
      const latestStatus = mapInterestStatus(latest.status);
      if (latestStatus !== status) {
        throw new InvalidInterestTransitionError(latestStatus, status);
      }
    }

    return mapInterestReceipt(await this.prisma.interest.findUniqueOrThrow({
      where,
      select: { listingId: true, status: true, createdAt: true, updatedAt: true },
    }));
  }

  async listReceived(ownerUserId: string): Promise<ReceivedInterestView[]> {
    const interests = await this.prisma.interest.findMany({
      where: { listing: { property: { owner: { userId: ownerUserId } } } },
      select: {
        userId: true,
        status: true,
        createdAt: true,
        listing: {
          select: {
            id: true,
            title: true,
            property: {
              select: {
                residence: { select: { neighborhood: true, city: true } },
              },
            },
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            student: { select: { course: true, period: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return interests.map(({ userId, status, createdAt, listing, user }) => ({
      userId,
      listingId: listing.id,
      listingTitle: listing.title,
      neighborhood: listing.property.residence.neighborhood,
      city: listing.property.residence.city,
      name: user.name,
      email: user.email,
      phone: user.phone,
      course: user.student?.course ?? null,
      period: user.student?.period ?? null,
      status,
      interestedAt: createdAt,
    }));
  }

  async updateStatus(
    ownerUserId: string,
    listingId: string,
    interestedUserId: string,
    status: InterestStatus,
  ): Promise<InterestReceipt> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { property: { select: { owner: { select: { userId: true } } } } },
    });
    if (!listing) throw new ListingNotFoundError();
    if (listing.property.owner.userId !== ownerUserId) {
      throw new InterestAccessDeniedError();
    }

    const where = { userId_listingId: { userId: interestedUserId, listingId } };
    const existingInterest = await this.prisma.interest.findUnique({ where, select: { userId: true } });
    if (!existingInterest) throw new InterestNotFoundError();

    return this.prisma.interest.update({
      where,
      data: { status: status as PrismaInterestStatus, updatedAt: new Date() },
      select: { listingId: true, status: true, createdAt: true, updatedAt: true },
    });
  }
}
