import { Injectable } from '@nestjs/common';
import { isUuid } from '../../../../../shared/infra/database/uuid.js';
import type { Prisma } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import type {
  AdminListingPage,
  AdminListingQuery,
  AdminListingRecord,
} from '../../../domain/repositories/admin-listing.repository.js';
import { AdminListingRepository } from '../../../domain/repositories/admin-listing.repository.js';

const ADMIN_LISTING_INCLUDE = {
  property: {
    include: {
      residence: true,
      owner: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
  },
  media: { orderBy: { position: 'asc' } },
} satisfies Prisma.ListingInclude;

type AdminListingRow = Prisma.ListingGetPayload<{
  include: typeof ADMIN_LISTING_INCLUDE;
}>;

function toAdminRecord(row: AdminListingRow): AdminListingRecord {
  return {
    listingId: row.id,
    propertyId: row.propertyId,
    title: row.title,
    description: row.description,
    rules: row.rules,
    rent: Number(row.rent),
    condominium: row.condominium === null ? null : Number(row.condominium),
    contractType: row.contractType,
    minimumStay: row.minimumStay,
    status: toDomainListingStatus(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    property: {
      housingType: row.property.housingType,
      bedrooms: row.property.bedrooms,
      bathrooms: row.property.bathrooms,
      parkingSpaces: row.property.parkingSpaces,
      amenities: row.property.amenities,
      residence: {
        postalCode: row.property.residence.postalCode.trim(),
        state: row.property.residence.state.trim(),
        street: row.property.residence.street,
        number: row.property.residence.number,
        complement: row.property.residence.complement,
        city: row.property.residence.city,
        neighborhood: row.property.residence.neighborhood,
      },
      owner: {
        id: row.property.owner.user.id,
        name: row.property.owner.user.name,
        email: row.property.owner.user.email,
        phone: row.property.owner.user.phone,
      },
    },
    media: row.media.map((item) => ({
      id: item.id,
      type: item.type,
      url: item.url,
      position: item.position,
    })),
  };
}

function toDomainListingStatus(status: string): ListingStatus {
  switch (status) {
    case 'PENDING':
      return ListingStatus.PENDING;
    case 'IN_REVIEW':
      return ListingStatus.IN_REVIEW;
    case 'APPROVED':
      return ListingStatus.APPROVED;
    case 'REJECTED':
      return ListingStatus.REJECTED;
    default:
      throw new Error(`Status de anúncio não suportado: ${status}`);
  }
}

@Injectable()
export class PrismaAdminListingRepository extends AdminListingRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findPage(query: AdminListingQuery): Promise<AdminListingPage> {
    const where: Prisma.ListingWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      where.OR = [
        { title: contains },
        { description: contains },
        {
          property: {
            is: {
              residence: {
                is: { city: contains },
              },
            },
          },
        },
        {
          property: {
            is: {
              residence: {
                is: { neighborhood: contains },
              },
            },
          },
        },
        {
          property: {
            is: {
              owner: {
                is: {
                  user: {
                    is: { name: contains },
                  },
                },
              },
            },
          },
        },
        {
          property: {
            is: {
              owner: {
                is: {
                  user: {
                    is: { email: contains },
                  },
                },
              },
            },
          },
        },
      ];
      if (isUuid(query.search)) where.OR.push({ id: query.search });
    }

    const [rows, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        include: ADMIN_LISTING_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      items: rows.map(toAdminRecord),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findById(listingId: string): Promise<AdminListingRecord | null> {
    const row = await this.prisma.listing.findUnique({
      where: { id: listingId },
      include: ADMIN_LISTING_INCLUDE,
    });
    return row ? toAdminRecord(row) : null;
  }
}
