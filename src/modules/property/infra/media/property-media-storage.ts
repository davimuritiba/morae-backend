import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { BadRequestException, Injectable } from '@nestjs/common';
import { resolve, join } from 'node:path';
import { MediaType } from '../../domain/enums/media-type.enum.js';

export interface StoredPropertyPhoto {
  url: string;
  position: number;
  type: MediaType.PHOTO;
}

const MAX_PHOTOS = 10;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIRECTORY = resolve(process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads'));

function imageExtension(file: Express.Multer.File): string | null {
  const { buffer, mimetype } = file;
  if (
    mimetype === 'image/jpeg' &&
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) return 'jpg';

  if (
    mimetype === 'image/png' &&
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'png';

  if (
    mimetype === 'image/webp' &&
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';

  return null;
}

@Injectable()
export class PropertyMediaStorage {
  async storePhotos(files: Express.Multer.File[]): Promise<StoredPropertyPhoto[]> {
    if (files.length === 0 || files.length > MAX_PHOTOS) {
      throw new BadRequestException('Envie de 1 a 10 fotos do imóvel.');
    }

    const extensions = files.map((file) => {
      if (file.size > MAX_PHOTO_BYTES) {
        throw new BadRequestException('Cada foto deve ter no máximo 5 MB.');
      }

      const extension = imageExtension(file);
      if (!extension) {
        throw new BadRequestException('Use somente imagens JPEG, PNG ou WEBP válidas.');
      }
      return extension;
    });

    const directory = getPropertyUploadsDirectory();
    await mkdir(directory, { recursive: true });

    const stored: StoredPropertyPhoto[] = [];
    try {
      for (const [position, file] of files.entries()) {
        const filename = `${randomUUID()}.${extensions[position]}`;
        await writeFile(join(directory, filename), file.buffer, { flag: 'wx' });
        stored.push({ url: `/uploads/listings/${filename}`, position, type: MediaType.PHOTO });
      }
    } catch (error) {
      try {
        await this.removePhotos(stored);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          'Falha ao salvar as fotos e limpar os arquivos temporários.',
        );
      }
      throw error;
    }

    return stored;
  }

  async removePhotos(photos: StoredPropertyPhoto[]): Promise<void> {
    await Promise.all(
      photos.map((photo) => {
        const filename = photo.url.split('/').pop();
        if (!filename || !/^[0-9a-f-]+\.(jpg|png|webp)$/i.test(filename)) {
          throw new Error('Caminho de arquivo de foto inválido para remoção.');
        }
        return rm(join(getPropertyUploadsDirectory(), filename), { force: true });
      }),
    );
  }
}

export function getPropertyUploadsDirectory(): string {
  return join(UPLOAD_DIRECTORY, 'listings');
}
