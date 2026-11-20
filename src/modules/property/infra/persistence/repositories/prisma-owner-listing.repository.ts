import { Injectable } from '@nestjs/common';
import {
  ListingStatus as PrismaListingStatus,
  type Prisma,
} from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { OwnerListingRepository } from '../../../domain/repositories/owner-listing.repository.js';

const ownedListingWhere = (userId: string, listingId: string): Prisma.ListingWhereInput => ({
  id: listingId,
  property: { is: { owner: { is: { userId } } } },
});

@Injectable()
export class PrismaOwnerListingRepository extends OwnerListingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
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