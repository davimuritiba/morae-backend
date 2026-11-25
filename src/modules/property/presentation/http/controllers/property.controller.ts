import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ManageListingPhotosUseCase } from '../../../application/use-cases/manage-listing-photos/manage-listing-photos.use-case.js';
import type { ListingPhotos } from '../../../domain/repositories/owner-listing-media.repository.js';
import { MAX_IMAGE_BYTES } from '../../../../../shared/infra/media/public-image-directory.js';
import { ReorderListingPhotosDto } from '../dtos/reorder-listing-photos.dto.js';
import { PROPERTY_OWNER_ACCOUNT_TYPES } from '../../../../user/domain/enums/account-type.enum.js';
import { GetListingUseCase } from '../../../application/use-cases/get-listing/get-listing.use-case.js';
import { ListOwnerListingsUseCase, ManageOwnerListingUseCase } from '../../../application/use-cases/manage-owner-listing/manage-owner-listing.use-case.js';
import { RemoveOwnerListingUseCase } from '../../../application/use-cases/manage-owner-listing/remove-owner-listing.use-case.js';
import type { PublishPropertyInput } from '../../../application/use-cases/publish-property/publish-property.input.js';
import { PublishPropertyUseCase } from '../../../application/use-cases/publish-property/publish-property.use-case.js';
import { SearchListingsUseCase } from '../../../application/use-cases/search-listings/search-listings.use-case.js';
import { PropertyMediaStorage } from '../../../infra/media/property-media-storage.js';
import { CurrentUserId } from '../../../../../shared/presentation/decorators/current-user-id.decorator.js';
import {
  AccountTypeGuard,
  RequireAccountTypes,
} from '../../../../../shared/presentation/guards/account-type.guard.js';
import type { AuthenticatedRequest } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { ManageOwnerListingDto } from '../dtos/manage-owner-listing.dto.js';
import { PublishPropertyDto } from '../dtos/publish-property.dto.js';
import { SearchListingsDto } from '../dtos/search-listings.dto.js';

@Controller('properties')
export class PropertyController {
  constructor(
    private readonly publishProperty: PublishPropertyUseCase,
    private readonly searchListings: SearchListingsUseCase,
    private readonly getListing: GetListingUseCase,
    private readonly manageOwnerListing: ManageOwnerListingUseCase,
    private readonly listOwnerListings: ListOwnerListingsUseCase,
    private readonly removeOwnerListing: RemoveOwnerListingUseCase,
    private readonly mediaStorage: PropertyMediaStorage,
    private readonly listingPhotos: ManageListingPhotosUseCase,
  ) {}

  // ─── Fotos de um anúncio (só o dono) ─────────────────────────────────────
  // Todas respondem com { status, photos }: o status do anúncio e a lista
  // atualizada de fotos, já na ordem final. Adicionar fotos a um anúncio
  // aprovado ou arquivado o devolve para a moderação (PENDING).

  @Get(':listingId/photos')
  @UseGuards(JwtAuthGuard)
  listPhotos(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ): Promise<ListingPhotos> {
    return this.listingPhotos.list({ userId, listingId });
  }

  // Adiciona fotos (multipart, campo "photos") ao fim da lista.
  @Post(':listingId/photos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 10 },
    }),
  )
  addPhotos(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @UploadedFiles() photos: Express.Multer.File[] = [],
  ): Promise<ListingPhotos> {
    if (photos.length === 0) {
      throw new BadRequestException('Envie as fotos no campo "photos".');
    }
    return this.listingPhotos.add({ userId, listingId, files: photos });
  }

  @Put(':listingId/photos/order')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  reorderPhotos(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() input: ReorderListingPhotosDto,
  ): Promise<ListingPhotos> {
    return this.listingPhotos.reorder({ userId, listingId, photoIds: input.photoIds });
  }

  @Delete(':listingId/photos/:photoId')
  @UseGuards(JwtAuthGuard)
  removePhoto(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<ListingPhotos> {
    return this.listingPhotos.remove({ userId, listingId, photoId });
  }

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  search(@Query() query: SearchListingsDto) {
    return this.searchListings.execute({
      location: query.location,
      maxRent: query.maxRent,
      housingType: query.housingType,
      minBedrooms: query.minBedrooms,
      sortBy: query.sortBy,
    });
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUserId() userId: string) {
    return this.listOwnerListings.execute({ userId });
  }

  @Get(':listingId')
  getListingById(@Param('listingId', ParseUUIDPipe) listingId: string) {
    return this.getListing.execute({ listingId });
  }

  @Patch(':listingId/status')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  manageStatus(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Body() input: ManageOwnerListingDto,
  ) {
    return this.manageOwnerListing.execute({ userId, listingId, status: input.status });
  }

  @Delete(':listingId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUserId() userId: string,
    @Param('listingId', ParseUUIDPipe) listingId: string,
  ): Promise<void> {
    await this.removeOwnerListing.execute({ userId, listingId });
  }

  @Post()
  @UseGuards(JwtAuthGuard, AccountTypeGuard)
  @RequireAccountTypes(...PROPERTY_OWNER_ACCOUNT_TYPES)
  @UseInterceptors(
    FilesInterceptor('photos', 10, {
      limits: { fileSize: 5 * 1024 * 1024, files: 10 },
    }),
  )
  async publish(
    @Req() request: AuthenticatedRequest,
    @Body() input: PublishPropertyDto,
    @UploadedFiles() photos: Express.Multer.File[] = [],
  ): Promise<{ propertyId: string; listingId: string }> {
    if (photos.length === 0) {
      throw new BadRequestException('Adicione ao menos uma foto do imóvel.');
    }

    const media = await this.mediaStorage.storePhotos(photos);
    const publishInput: PublishPropertyInput = {
      ownerId: request.user.userId,
      cohabitantIds: [request.user.userId],
      postalCode: input.postalCode,
      state: input.state,
      street: input.street,
      number: input.number,
      complement: input.complement,
      city: input.city,
      neighborhood: input.neighborhood,
      housingType: input.housingType,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      parkingSpaces: input.parkingSpaces,
      amenities: input.amenities,
      title: input.title,
      description: input.description,
      rules: input.rules,
      rent: input.rent,
      condominium: input.condominium,
      contractType: input.contractType,
      minimumStay: input.minimumStay,
      media,
    };
    try {
      return await this.publishProperty.execute(publishInput);
    } catch (error) {
      try {
        await this.mediaStorage.removePhotos(media);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Falha ao cadastrar o imóvel e limpar as fotos enviadas.',
        );
      }
      throw error;
    }
  }
}
