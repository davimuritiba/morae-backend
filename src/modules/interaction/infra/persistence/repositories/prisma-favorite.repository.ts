import { Injectable } from '@nestjs/common';
import { ListingStatus } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import { FavoriteRepository } from '../../../domain/repositories/favorite.repository.js';
import type {
  FavoriteListingView,
  FavoriteReceipt,
} from '../../../domain/repositories/favorite.repository.js';

@Injectable()
export class PrismaFavoriteRepository extends FavoriteRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listForUser(userId: string): Promise<FavoriteListingView[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId, listing: { status: ListingStatus.APPROVED } },
      include: {
        listing: {
          include: {
            property: { include: { residence: true } },
            media: { orderBy: { position: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map(({ listing, createdAt }) => ({
      listingId: listing.id,
      propertyId: listing.propertyId,
      title: listing.title,
      description: listing.description,
      rent: Number(listing.rent),
      condominium: listing.condominium === null ? null : Number(listing.condominium),
      housingType: listing.property.housingType,
      bedrooms: listing.property.bedrooms,
      bathrooms: listing.property.bathrooms,
      parkingSpaces: listing.property.parkingSpaces,
      amenities: listing.property.amenities,
      location: {
        city: listing.property.residence.city,
        neighborhood: listing.property.residence.neighborhood,
        state: listing.property.residence.state,
      },
      media: listing.media.map(({ type, url, position }) => ({ type, url, position })),
      favoritedAt: createdAt,
    }));
  }

  async add(userId: string, listingId: string): Promise<FavoriteReceipt> {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, status: ListingStatus.APPROVED },
      select: { id: true },
    });
    if (!listing) throw new ListingNotFoundError();

    const favorite = await this.prisma.favorite.upsert({
      where: { userId_listingId: { userId, listingId } },
      create: { userId, listingId },
      update: {},
      select: { listingId: true, createdAt: true },
    });
    return favorite;
  }

  async remove(userId: string, listingId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, listingId } });
  }
}
