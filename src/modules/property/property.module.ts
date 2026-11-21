import { Module } from '@nestjs/common';
import { GetAdminListingUseCase } from './application/use-cases/get-admin-listing/get-admin-listing.use-case.js';
import { ListAdminListingsUseCase } from './application/use-cases/list-admin-listings/list-admin-listings.use-case.js';
import { PublishPropertyUseCase } from './application/use-cases/publish-property/publish-property.use-case.js';
import { AdminListingRepository } from './domain/repositories/admin-listing.repository.js';
import { PropertyRepository } from './domain/repositories/property.repository.js';
import { PropertyMediaStorage } from './infra/media/property-media-storage.js';
import { PrismaAdminListingRepository } from './infra/persistence/repositories/prisma-admin-listing.repository.js';
import { PrismaPropertyRepository } from './infra/persistence/repositories/prisma-property.repository.js';
import { AdminListingsController } from './presentation/http/controllers/admin-listings.controller.js';
import { PropertyController } from './presentation/http/controllers/property.controller.js';

@Module({
  providers: [
    {
      provide: PublishPropertyUseCase,
      useFactory: (properties: PropertyRepository) =>
        new PublishPropertyUseCase(properties),
      inject: [PropertyRepository],
    },
    PropertyMediaStorage,
    PrismaAdminListingRepository,
    { provide: AdminListingRepository, useExisting: PrismaAdminListingRepository },
    {
      provide: ListAdminListingsUseCase,
      useFactory: (listings: AdminListingRepository) =>
        new ListAdminListingsUseCase(listings),
      inject: [AdminListingRepository],
    },
    {
      provide: GetAdminListingUseCase,
      useFactory: (listings: AdminListingRepository) =>
        new GetAdminListingUseCase(listings),
      inject: [AdminListingRepository],
    },
    PrismaPropertyRepository,
    { provide: PropertyRepository, useExisting: PrismaPropertyRepository },
  ],
  controllers: [PropertyController, AdminListingsController],
  exports: [PublishPropertyUseCase, PropertyRepository],
})
export class PropertyModule {}
