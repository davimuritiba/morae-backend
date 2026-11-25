import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module.js';
import { GetAdminListingUseCase } from './application/use-cases/get-admin-listing/get-admin-listing.use-case.js';
import { GetListingUseCase } from './application/use-cases/get-listing/get-listing.use-case.js';
import { ListAdminListingsUseCase } from './application/use-cases/list-admin-listings/list-admin-listings.use-case.js';
import { ModerateAdminListingUseCase } from './application/use-cases/moderate-admin-listing/moderate-admin-listing.use-case.js';
import { ListOwnerListingsUseCase, ManageOwnerListingUseCase } from './application/use-cases/manage-owner-listing/manage-owner-listing.use-case.js';
import { RemoveOwnerListingUseCase } from './application/use-cases/manage-owner-listing/remove-owner-listing.use-case.js';
import { PublishPropertyUseCase } from './application/use-cases/publish-property/publish-property.use-case.js';
import { SearchListingsUseCase } from './application/use-cases/search-listings/search-listings.use-case.js';
import { AdminListingRepository } from './domain/repositories/admin-listing.repository.js';
import { ListingRepository } from './domain/repositories/listing.repository.js';
import { OwnerListingRepository } from './domain/repositories/owner-listing.repository.js';
import { PropertyRepository } from './domain/repositories/property.repository.js';
import { PropertyMediaStorage } from './infra/media/property-media-storage.js';
import { Logger } from '../../shared/application/logger.js';
import { NestLoggerAdapter } from '../../shared/infra/nest-logger.js';
import { ListingPhotoStorage } from './application/ports/listing-photo-storage.port.js';
import { ManageListingPhotosUseCase } from './application/use-cases/manage-listing-photos/manage-listing-photos.use-case.js';
import { OwnerListingMediaRepository } from './domain/repositories/owner-listing-media.repository.js';
import { PrismaOwnerListingMediaRepository } from './infra/persistence/repositories/prisma-owner-listing-media.repository.js';
import { PrismaAdminListingRepository } from './infra/persistence/repositories/prisma-admin-listing.repository.js';
import { PrismaListingRepository } from './infra/persistence/repositories/prisma-listing.repository.js';
import { PrismaOwnerListingRepository } from './infra/persistence/repositories/prisma-owner-listing.repository.js';
import { PrismaPropertyRepository } from './infra/persistence/repositories/prisma-property.repository.js';
import { AdminListingsController } from './presentation/http/controllers/admin-listings.controller.js';
import { PropertyController } from './presentation/http/controllers/property.controller.js';

@Module({
  imports: [UserModule],
  providers: [
    PrismaPropertyRepository,
    { provide: PropertyRepository, useExisting: PrismaPropertyRepository },
    PropertyMediaStorage,
    { provide: ListingPhotoStorage, useExisting: PropertyMediaStorage },
    { provide: Logger, useFactory: () => new NestLoggerAdapter('PropertyModule') },
    { provide: OwnerListingMediaRepository, useClass: PrismaOwnerListingMediaRepository },
    {
      provide: ManageListingPhotosUseCase,
      useFactory: (
        media: OwnerListingMediaRepository,
        storage: ListingPhotoStorage,
        logger: Logger,
      ) => new ManageListingPhotosUseCase(media, storage, logger),
      inject: [OwnerListingMediaRepository, ListingPhotoStorage, Logger],
    },
    {
      provide: PublishPropertyUseCase,
      useFactory: (properties: PropertyRepository) =>
        new PublishPropertyUseCase(properties),
      inject: [PropertyRepository],
    },
    { provide: ListingRepository, useClass: PrismaListingRepository },
    {
      provide: SearchListingsUseCase,
      useFactory: (listings: ListingRepository) =>
        new SearchListingsUseCase(listings),
      inject: [ListingRepository],
    },
    {
      provide: GetListingUseCase,
      useFactory: (listings: ListingRepository) =>
        new GetListingUseCase(listings),
      inject: [ListingRepository],
    },
    PrismaAdminListingRepository,
    {
      provide: AdminListingRepository,
      useExisting: PrismaAdminListingRepository,
    },
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
    {
      provide: ModerateAdminListingUseCase,
      useFactory: (listings: AdminListingRepository) =>
        new ModerateAdminListingUseCase(listings),
      inject: [AdminListingRepository],
    },
    PrismaOwnerListingRepository,
    {
      provide: OwnerListingRepository,
      useExisting: PrismaOwnerListingRepository,
    },
    {
      provide: ManageOwnerListingUseCase,
      useFactory: (listings: OwnerListingRepository) =>
        new ManageOwnerListingUseCase(listings),
      inject: [OwnerListingRepository],
    },
    {
      provide: ListOwnerListingsUseCase,
      useFactory: (listings: OwnerListingRepository) => new ListOwnerListingsUseCase(listings),
      inject: [OwnerListingRepository],
    },
    {
      provide: RemoveOwnerListingUseCase,
      useFactory: (listings: OwnerListingRepository) =>
        new RemoveOwnerListingUseCase(listings),
      inject: [OwnerListingRepository],
    },
  ],
  controllers: [PropertyController, AdminListingsController],
  exports: [PublishPropertyUseCase, PropertyRepository],
})
export class PropertyModule {}
