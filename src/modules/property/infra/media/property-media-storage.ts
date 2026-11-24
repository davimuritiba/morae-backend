import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PublicImageDirectory,
  type UploadedImage,
} from '../../../../shared/infra/media/public-image-directory.js';
import { ListingPhotoStorage } from '../../application/ports/listing-photo-storage.port.js';
import { MAX_LISTING_PHOTOS } from '../../application/use-cases/manage-listing-photos/manage-listing-photos.use-case.js';
import { MediaType } from '../../domain/enums/media-type.enum.js';

export interface StoredPropertyPhoto {
  url: string;
  position: number;
  type: MediaType.PHOTO;
}

const listingPhotos = new PublicImageDirectory('listings');

// Grava as fotos dos anúncios em UPLOADS_DIR/listings, servidas em
// /uploads/listings.
@Injectable()
export class PropertyMediaStorage extends ListingPhotoStorage {
  // Fotos de um anúncio novo, com posições a partir de 0.
  async storePhotos(files: UploadedImage[]): Promise<StoredPropertyPhoto[]> {
    if (files.length === 0 || files.length > MAX_LISTING_PHOTOS) {
      throw new BadRequestException('Envie de 1 a 10 fotos do imóvel.');
    }
    const urls = await this.storeFiles(files);
    return urls.map((url, position) => ({ url, position, type: MediaType.PHOTO }));
  }

  async removePhotos(photos: { url: string }[]): Promise<void> {
    await this.removeFiles(photos.map((photo) => photo.url));
  }

  storeFiles(files: UploadedImage[]): Promise<string[]> {
    return listingPhotos.save(files);
  }

  removeFiles(urls: string[]): Promise<void> {
    return listingPhotos.remove(urls);
  }
}
