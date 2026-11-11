import type { UseCase } from '../../../../../shared/application/use-case.js';
import { Listing } from '../../../domain/entities/listing.entity.js';
import { ListingMedia } from '../../../domain/entities/listing-media.entity.js';
import { Property } from '../../../domain/entities/property.entity.js';
import { Residence } from '../../../domain/entities/residence.entity.js';
import type { PropertyRepository } from '../../../domain/repositories/property.repository.js';
import type { PublishPropertyInput } from './publish-property.input.js';
import type { PublishPropertyOutput } from './publish-property.output.js';

export class PublishPropertyUseCase implements UseCase<PublishPropertyInput, PublishPropertyOutput> {
  constructor(private readonly properties: PropertyRepository) {}

  async execute(input: PublishPropertyInput): Promise<PublishPropertyOutput> {
    const residence = Residence.create(input);
    const media = (input.media ?? []).map((item) => ListingMedia.create(item));
    const listing = Listing.create({ ...input, media });
    const property = Property.create({
      ownerId: input.ownerId,
      cohabitantIds: input.cohabitantIds,
      residence,
      housingType: input.housingType,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      parkingSpaces: input.parkingSpaces ?? 0,
      amenities: input.amenities ?? [],
      listing,
    });

    await this.properties.save(property);
    return { propertyId: property.id, listingId: listing.id };
  }
}
