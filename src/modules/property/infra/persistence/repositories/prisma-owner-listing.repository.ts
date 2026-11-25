import { Injectable } from '@nestjs/common';
import {
  ListingStatus as PrismaListingStatus,
  type Prisma,
} from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { OwnerListingRepository } from '../../../domain/repositories/owner-listing.repository.js';
import type { OwnedListingSummary } from '../../../domain/repositories/owner-listing.repository.js';

const ownedListingWhere = (userId: string, listingId: string): Prisma.ListingWhereInput => ({
  id: listingId,
  property: { is: { owner: { is: { userId } } } },
});

@Injectable()
export class PrismaOwnerListingRepository extends OwnerListingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listOwned(userId: string): Promise<OwnedListingSummary[]> {
    const listings = await this.prisma.listing.findMany({
      where: {
        property: { is: { owner: { is: { userId } } } },
        status: {
          in: [
            PrismaListingStatus.PENDING,
            PrismaListingStatus.IN_REVIEW,
            PrismaListingStatus.APPROVED,
            PrismaListingStatus.REJECTED,
            PrismaListingStatus.ARCHIVED,
          ],
        },
      },
      include: {
        property: {
          include: {
            residence: true,
            _count: { select: { cohabitants: true } },
          },
        },
        media: {
          where: { type: 'PHOTO' },
          orderBy: { position: 'asc' },
          take: 1,
        },
        _count: { select: { interests: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return listings.map((listing) => ({
      listingId: listing.id,
      propertyId: listing.propertyId,
      title: listing.title,
      neighborhood: listing.property.residence.neighborhood,
      city: listing.property.residence.city,
      state: listing.property.residence.state,
      housingType: listing.property.housingType,
      bedrooms: listing.property.bedrooms,
      bathrooms: listing.property.bathrooms,
      residents: listing.property._count.cohabitants,
      rent: Number(listing.rent),
      interestedCount: listing._count.interests,
      photoUrl: listing.media[0]?.url ?? null,
      status: listing.status as
        | ListingStatus.PENDING
        | ListingStatus.IN_REVIEW
        | ListingStatus.APPROVED
        | ListingStatus.REJECTED
        | ListingStatus.ARCHIVED,
    }));
  }

  async findOwnedStatus(userId: string, listingId: string): Promise<ListingStatus | null> {
    const listing = await this.prisma.listing.findFirst({
      where: ownedListingWhere(userId, listingId),
      select: { status: true },
    });
    return listing ? (listing.status as ListingStatus) : null;
  }

  async transitionOwnedStatus(
    userId: string,
    listingId: string,
    currentStatus: ListingStatus,
    nextStatus: ListingStatus,
  ): Promise<boolean> {
    const result = await this.prisma.listing.updateMany({
      where: {
        ...ownedListingWhere(userId, listingId),
        status: currentStatus as PrismaListingStatus,
      },
      data: { status: nextStatus as PrismaListingStatus },
    });
    return result.count === 1;
  }
}
