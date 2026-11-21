import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PublishPropertyUseCase } from '../../../application/use-cases/publish-property/publish-property.use-case.js';
import type { PublishPropertyInput } from '../../../application/use-cases/publish-property/publish-property.input.js';
import { PropertyMediaStorage } from '../../../infra/media/property-media-storage.js';
import type { AuthenticatedRequest } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { JwtAuthGuard } from '../../../../../shared/presentation/guards/jwt-auth.guard.js';
import { PublishPropertyDto } from '../dtos/publish-property.dto.js';

@Controller('properties')
export class PropertyController {
  constructor(
    private readonly publishProperty: PublishPropertyUseCase,
    private readonly mediaStorage: PropertyMediaStorage,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
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
