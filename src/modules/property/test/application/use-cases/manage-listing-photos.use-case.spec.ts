import { FakeLogger } from '../../../../../shared/test/fakes/fake-logger.js';
import { ListingPhotoStorage, type ListingPhotoFile } from '../../../application/ports/listing-photo-storage.port.js';
import { ManageListingPhotosUseCase } from '../../../application/use-cases/manage-listing-photos/manage-listing-photos.use-case.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { MediaType } from '../../../domain/enums/media-type.enum.js';
import { InvalidListingPhotoCountError } from '../../../domain/errors/invalid-listing-photo-count.error.js';
import { InvalidListingPhotoOrderError } from '../../../domain/errors/invalid-listing-photo-order.error.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import { ListingPhotoNotFoundError } from '../../../domain/errors/listing-photo-not-found.error.js';
import {
  OwnerListingMediaRepository,
  type ListingPhoto,
  type ListingPhotos,
} from '../../../domain/repositories/owner-listing-media.repository.js';

const OWNER = 'owner-1';
const LISTING = 'listing-1';

class InMemoryOwnerListingMedia extends OwnerListingMediaRepository {
  photos: ListingPhoto[] = [];
  status = ListingStatus.APPROVED;

  async findOwnedMedia(userId: string, listingId: string): Promise<ListingPhotos | null> {
    return userId === OWNER && listingId === LISTING
      ? { status: this.status, photos: [...this.photos] }
      : null;
  }

  async updateOwnedMedia(
    userId: string,
    listingId: string,
    change: (current: ListingPhotos) => ListingPhotos,
  ): Promise<ListingPhotos | null> {
    if (userId !== OWNER || listingId !== LISTING) return null;
    const next = change({ status: this.status, photos: [...this.photos] });
    this.status = next.status;
    this.photos = next.photos.map((photo, position) => ({ ...photo, position }));
    return { status: this.status, photos: [...this.photos] };
  }
}

class FakeListingPhotoStorage extends ListingPhotoStorage {
  stored: string[] = [];
  removed: string[] = [];

  async storeFiles(files: ListingPhotoFile[]): Promise<string[]> {
    const urls = files.map((_, i) => `/uploads/listings/new-${this.stored.length + i}.jpg`);
    this.stored.push(...urls);
    return urls;
  }

  async removeFiles(urls: string[]): Promise<void> {
    this.removed.push(...urls);
  }
}

const file: ListingPhotoFile = { buffer: Buffer.from('x'), mimetype: 'image/jpeg', size: 1 };
const photo = (n: number): ListingPhoto => ({
  id: `p${n}`,
  type: MediaType.PHOTO,
  url: `/uploads/listings/p${n}.jpg`,
  position: n,
});

describe('ManageListingPhotosUseCase', () => {
  let media: InMemoryOwnerListingMedia;
  let storage: FakeListingPhotoStorage;
  let logger: FakeLogger;
  let sut: ManageListingPhotosUseCase;
  const ref = { userId: OWNER, listingId: LISTING };

  beforeEach(() => {
    media = new InMemoryOwnerListingMedia();
    media.photos = [photo(0), photo(1), photo(2)];
    storage = new FakeListingPhotoStorage();
    logger = new FakeLogger();
    sut = new ManageListingPhotosUseCase(media, storage, logger);
  });

  it('lista as fotos do anúncio do dono', async () => {
    await expect(sut.list(ref)).resolves.toMatchObject({ status: ListingStatus.APPROVED });
    expect((await sut.list(ref)).photos).toHaveLength(3);
  });

  it('trata anúncio de outra pessoa como inexistente', async () => {
    await expect(sut.list({ userId: 'intruso', listingId: LISTING })).rejects.toBeInstanceOf(
      ListingNotFoundError,
    );
    await expect(
      sut.add({ userId: 'intruso', listingId: LISTING, files: [file] }),
    ).rejects.toBeInstanceOf(ListingNotFoundError);
    expect(storage.stored).toEqual([]);
  });

  it('adiciona fotos ao fim da lista', async () => {
    const { photos: result } = await sut.add({ ...ref, files: [file, file] });

    expect(result.map((p) => p.url)).toEqual([
      '/uploads/listings/p0.jpg',
      '/uploads/listings/p1.jpg',
      '/uploads/listings/p2.jpg',
      '/uploads/listings/new-0.jpg',
      '/uploads/listings/new-1.jpg',
    ]);
    expect(result.map((p) => p.position)).toEqual([0, 1, 2, 3, 4]);
  });

  it.each([
    [ListingStatus.APPROVED, ListingStatus.PENDING],
    [ListingStatus.ARCHIVED, ListingStatus.PENDING],
    [ListingStatus.PENDING, ListingStatus.PENDING],
    [ListingStatus.IN_REVIEW, ListingStatus.IN_REVIEW],
    [ListingStatus.REJECTED, ListingStatus.REJECTED],
  ])('foto nova em anúncio %s deixa o anúncio %s', async (before, after) => {
    media.status = before;

    const { status } = await sut.add({ ...ref, files: [file] });

    expect(status).toBe(after);
    expect(media.status).toBe(after);
  });

  it('não passa de 10 fotos e não grava arquivos nesse caso', async () => {
    media.photos = Array.from({ length: 9 }, (_, i) => photo(i));

    await expect(sut.add({ ...ref, files: [file, file] })).rejects.toBeInstanceOf(
      InvalidListingPhotoCountError,
    );
    expect(storage.stored).toEqual([]);
  });

  it('apaga os arquivos novos se a gravação no banco falhar', async () => {
    media.updateOwnedMedia = async () => {
      throw new Error('banco fora do ar');
    };

    await expect(sut.add({ ...ref, files: [file] })).rejects.toThrow('banco fora do ar');
    expect(storage.removed).toEqual(['/uploads/listings/new-0.jpg']);
  });

  it('remove uma foto, refaz as posições e apaga o arquivo', async () => {
    const { photos: result, status } = await sut.remove({ ...ref, photoId: 'p1' });

    expect(status).toBe(ListingStatus.APPROVED);

    expect(result.map((p) => [p.id, p.position])).toEqual([['p0', 0], ['p2', 1]]);
    expect(storage.removed).toEqual(['/uploads/listings/p1.jpg']);
  });

  it('não remove a última foto', async () => {
    media.photos = [photo(0)];

    await expect(sut.remove({ ...ref, photoId: 'p0' })).rejects.toBeInstanceOf(
      InvalidListingPhotoCountError,
    );
    expect(media.photos).toHaveLength(1);
    expect(storage.removed).toEqual([]);
  });

  it('responde 404 para foto que não é do anúncio', async () => {
    await expect(sut.remove({ ...ref, photoId: 'p9' })).rejects.toBeInstanceOf(
      ListingPhotoNotFoundError,
    );
  });

  it('reordena as fotos', async () => {
    const { photos: result, status } = await sut.reorder({ ...ref, photoIds: ['p2', 'p0', 'p1'] });

    expect(status).toBe(ListingStatus.APPROVED);

    expect(result.map((p) => [p.id, p.position])).toEqual([['p2', 0], ['p0', 1], ['p1', 2]]);
  });

  it.each([
    [['p0', 'p1']],
    [['p0', 'p1', 'p1']],
    [['p0', 'p1', 'p9']],
    [['p0', 'p1', 'p2', 'p9']],
  ])('rejeita ordem que não é uma permutação das fotos: %j', async (photoIds) => {
    await expect(sut.reorder({ ...ref, photoIds })).rejects.toBeInstanceOf(
      InvalidListingPhotoOrderError,
    );
    expect(media.photos.map((p) => p.id)).toEqual(['p0', 'p1', 'p2']);
  });
});
