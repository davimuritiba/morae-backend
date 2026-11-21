import { BadRequestException } from '@nestjs/common';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('PropertyMediaStorage', () => {
  let uploadsDirectory: string;
  let storage: import('../../infra/media/property-media-storage.js').PropertyMediaStorage;

  beforeAll(async () => {
    uploadsDirectory = await mkdtemp(join(tmpdir(), 'morae-listing-photos-'));
    process.env.UPLOADS_DIR = uploadsDirectory;
    const { PropertyMediaStorage } = await import(
      '../../infra/media/property-media-storage.js'
    );
    storage = new PropertyMediaStorage();
  });

  afterAll(async () => {
    await rm(uploadsDirectory, { recursive: true, force: true });
    delete process.env.UPLOADS_DIR;
  });

  it('stores valid PNG bytes under a generated public path', async () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const [photo] = await storage.storePhotos([
      { mimetype: 'image/png', size: buffer.length, buffer } as Express.Multer.File,
    ]);

    expect(photo).toMatchObject({
      type: 'PHOTO',
      position: 0,
    });
    expect(photo.url).toMatch(/^\/uploads\/listings\/[0-9a-f-]+\.png$/i);
    await expect(
      readFile(join(uploadsDirectory, 'listings', photo.url.split('/').pop()!)),
    ).resolves.toEqual(buffer);
    await storage.removePhotos([photo]);
  });

  it('rejects a file with an image MIME type but invalid image content', async () => {
    const buffer = Buffer.from('not really a png');

    await expect(
      storage.storePhotos([
        { mimetype: 'image/png', size: buffer.length, buffer } as Express.Multer.File,
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires at least one uploaded image', async () => {
    await expect(storage.storePhotos([])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
