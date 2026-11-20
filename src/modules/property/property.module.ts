import { Module } from '@nestjs/common';
import { PublishPropertyUseCase } from './application/use-cases/publish-property/publish-property.use-case.js';
import { PropertyRepository } from './domain/repositories/property.repository.js';
import { ListingRepository } from './domain/repositories/listing.repository.js';
import { PrismaPropertyRepository } from './infra/persistence/repositories/prisma-property.repository.js';
import { PrismaListingRepository } from './infra/persistence/repositories/prisma-listing.repository.js';
import { SearchListingsUseCase } from './application/use-cases/search-listings/search-listings.use-case.js';
import { GetListingUseCase } from './application/use-cases/get-listing/get-listing.use-case.js';
import { PropertyController } from './presentation/http/controllers/property.controller.js';
import { AdminListingsController } from './presentation/http/controllers/admin-listings.controller.js';
import { AdminListingRepository } from './domain/repositories/admin-listing.repository.js';
import { PrismaAdminListingRepository } from './infra/persistence/repositories/prisma-admin-listing.repository.js';
import { ListAdminListingsUseCase } from './application/use-cases/list-admin-listings/list-admin-listings.use-case.js';
import { GetAdminListingUseCase } from './application/use-cases/get-admin-listing/get-admin-listing.use-case.js';

@Module({
  providers: [
    { provide: PropertyRepository, useClass: PrismaPropertyRepository },
    {
      provide: PublishPropertyUseCase,
      useFactory: (properties: PropertyRepository) =>
        new PublishPropertyUseCase(properties),
      inject: [PropertyRepository],
    },
    { provide: ListingRepository, useClass: PrismaListingRepository },
    {
      provide: SearchListingsUseCase,
      useFactory: (listings: ListingRepository) => new SearchListingsUseCase(listings),
      inject: [ListingRepository],
    },
    {
      provide: GetListingUseCase,
      useFactory: (listings: ListingRepository) => new GetListingUseCase(listings),
      inject: [ListingRepository],
    },
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
  ],
  controllers: [PropertyController, AdminListingsController],
  exports: [PublishPropertyUseCase, PropertyRepository],
})
export class PropertyModule {}
