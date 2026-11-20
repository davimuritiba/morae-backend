import { Injectable } from '@nestjs/common';
import { ListingStatus } from '../../../../../shared/infra/database/generated/prisma/client.js';
import type { Prisma } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { HousingType } from '../../../domain/enums/housing-type.enum.js';
import { MediaType } from '../../../domain/enums/media-type.enum.js';
import { ListingRepository } from '../../../domain/repositories/listing.repository.js';
import type {
  ListingSearchResult,
  SearchListingsFilter,
} from '../../../domain/repositories/listing.repository.js';

const listingSearchInclude = {
  property: {
    include: {
      residence: true,
      owner: { include: { user: { select: { id: true, name: true } } } },
    },
  },
  media: { orderBy: { position: 'asc' } },
} satisfies Prisma.ListingInclude;

type ListingWithSearchDetails = Prisma.ListingGetPayload<{
  include: typeof listingSearchInclude;
}>;

@Injectable()
export class PrismaListingRepository extends ListingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async search(filter: SearchListingsFilter): Promise<ListingSearchResult[]> {
    const location = filter.location?.trim();
    const rows = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.APPROVED,
        ...(location
          ? {
              property: {
                is: {
                  residence: {
                    is: {
                      OR: [
                        { city: { contains: location, mode: 'insensitive' } },
                        { neighborhood: { contains: location, mode: 'insensitive' } },
                        { state: { contains: location, mode: 'insensitive' } },
                      ],
                    },
                  },
                },
              },
            }
          : {}),
      },
      include: listingSearchInclude,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toSearchResult(row));
  }

  async findApprovedById(listingId: string): Promise<ListingSearchResult | null> {
    const row = await this.prisma.listing.findFirst({
      where: { id: listingId, status: ListingStatus.APPROVED },
      include: listingSearchInclude,
    });
    return row ? this.toSearchResult(row) : null;
  }

  private toSearchResult(row: ListingWithSearchDetails): ListingSearchResult {
    return {
      listingId: row.id,
      propertyId: row.propertyId,
      title: row.title,
      description: row.description,
      rent: Number(row.rent),
      condominium: row.condominium === null ? null : Number(row.condominium),
      housingType: row.property.housingType as HousingType,
      bedrooms: row.property.bedrooms,
      bathrooms: row.property.bathrooms,
      parkingSpaces: row.property.parkingSpaces,
      amenities: row.property.amenities,
      location: {
        city: row.property.residence.city,
        neighborhood: row.property.residence.neighborhood,
        state: row.property.residence.state,
      },
      advertiser: {
        userId: row.property.owner.user.id,
        name: row.property.owner.user.name,
      },
      media: row.media.map((item) => ({
        type: item.type as MediaType,
        url: item.url,
        position: item.position,
      })),
      createdAt: row.createdAt,
    };
  }
}
