import type { Prisma } from '../../../../../shared/infra/database/generated/prisma/client.js';
import { ContractType } from '../../../domain/enums/contract-type.enum.js';
import { HousingType } from '../../../domain/enums/housing-type.enum.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { MediaType } from '../../../domain/enums/media-type.enum.js';
import { MinimumStay } from '../../../domain/enums/minimum-stay.enum.js';
import { Listing } from '../../../domain/entities/listing.entity.js';
import { ListingMedia } from '../../../domain/entities/listing-media.entity.js';
import { Property } from '../../../domain/entities/property.entity.js';
import { Residence } from '../../../domain/entities/residence.entity.js';

export type PropertyWithListing = Prisma.PropertyGetPayload<{
  include: { residence: true; cohabitants: true; listings: { include: { media: true } } };
}>;

const enumValue = <T extends string>(value: T): T => value;

export class PropertyMapper {
  static toDomain(raw: PropertyWithListing): Property {
    const residence = Residence.restore(raw.residence.id, {
      postalCode: raw.residence.postalCode,
      state: raw.residence.state,
      street: raw.residence.street,
      number: raw.residence.number,
      complement: raw.residence.complement,
      city: raw.residence.city,
      neighborhood: raw.residence.neighborhood,
      createdAt: raw.residence.createdAt,
      updatedAt: raw.residence.updatedAt,
    });
    const rawListing = raw.listings[0];
    if (!rawListing) throw new Error(`Property ${raw.id} não possui anúncio.`);
    const media = rawListing.media.map((item) => ListingMedia.restore(item.id, {
      type: enumValue(item.type) as MediaType,
      url: item.url,
      position: item.position,
      createdAt: item.createdAt,
    }));
    const listing = Listing.restore(rawListing.id, {
      title: rawListing.title,
      description: rawListing.description,
      rules: rawListing.rules,
      rent: Number(rawListing.rent),
      condominium: rawListing.condominium === null ? null : Number(rawListing.condominium),
      contractType: enumValue(rawListing.contractType) as ContractType,
      minimumStay: enumValue(rawListing.minimumStay) as MinimumStay,
      status: enumValue(rawListing.status) as ListingStatus,
      media,
      createdAt: rawListing.createdAt,
      updatedAt: rawListing.updatedAt,
    });
    return Property.restore(raw.id, {
      cohabitantIds: raw.cohabitants.map((cohabitant) => cohabitant.userId),
      residence,
      housingType: enumValue(raw.housingType) as HousingType,
      bedrooms: raw.bedrooms,
      bathrooms: raw.bathrooms,
      parkingSpaces: raw.parkingSpaces,
      amenities: raw.amenities,
      listing,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(property: Property): Prisma.PropertyCreateInput {
    return {
      id: property.id,
      housingType: property.housingType,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      parkingSpaces: property.parkingSpaces,
      amenities: property.amenities.slice(),
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
      cohabitants: {
        create: property.cohabitantIds.map((userId) => ({ user: { connect: { id: userId } } })),
      },
      residence: {
        create: {
          id: property.residence.id,
          postalCode: property.residence.postalCode,
          state: property.residence.state,
          street: property.residence.street,
          number: property.residence.number,
          complement: property.residence.complement,
          city: property.residence.city,
          neighborhood: property.residence.neighborhood,
          createdAt: property.residence.createdAt,
          updatedAt: property.residence.updatedAt,
        },
      },
      listings: {
        create: {
          id: property.listing.id,
          title: property.listing.title,
          description: property.listing.description,
          rules: property.listing.rules,
          rent: property.listing.rent,
          condominium: property.listing.condominium,
          contractType: property.listing.contractType,
          minimumStay: property.listing.minimumStay,
          status: property.listing.status,
          createdAt: property.listing.createdAt,
          updatedAt: property.listing.updatedAt,
          media: {
            create: property.listing.media.map((item) => ({
              id: item.id,
              type: item.type,
              url: item.url,
              position: item.position,
              createdAt: item.createdAt,
            })),
          },
        },
      },
    };
  }
}
