import { Injectable } from '@nestjs/common';
import { ListingStatus } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { InterestAccessDeniedError } from '../../../domain/errors/interest-access-denied.error.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import { InterestRepository } from '../../../domain/repositories/interest.repository.js';
import type {
  InterestedUserView,
  InterestReceipt,
} from '../../../domain/repositories/interest.repository.js';

@Injectable()
export class PrismaInterestRepository extends InterestRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async add(userId: string, listingId: string): Promise<InterestReceipt> {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, status: ListingStatus.APPROVED },
      select: { id: true },
    });
    if (!listing) throw new ListingNotFoundError();

    return this.prisma.interest.upsert({
      where: { userId_listingId: { userId, listingId } },
      create: { userId, listingId },
      update: {},
      select: { listingId: true, createdAt: true },
    });
  }

  async remove(userId: string, listingId: string): Promise<void> {
    await this.prisma.interest.deleteMany({ where: { userId, listingId } });
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

    return interests.map(({ user, createdAt }) => ({
      name: user.name,
      email: user.email,
      phone: user.phone,
      photoUrl: user.photoUrl,
      course: user.student?.course ?? null,
      period: user.student?.period ?? null,
      bio: user.student?.profile?.bio ?? null,
      interestedAt: createdAt,
    }));
  }
}
