import { randomUUID } from 'node:crypto';
import type { Logger } from '../../../../../shared/application/logger.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { MediaType } from '../../../domain/enums/media-type.enum.js';
import { InvalidListingPhotoCountError } from '../../../domain/errors/invalid-listing-photo-count.error.js';
import { InvalidListingPhotoOrderError } from '../../../domain/errors/invalid-listing-photo-order.error.js';
import { ListingNotFoundError } from '../../../domain/errors/listing-not-found.error.js';
import { ListingPhotoNotFoundError } from '../../../domain/errors/listing-photo-not-found.error.js';
import type {
  ListingPhoto,
  ListingPhotos,
  OwnerListingMediaRepository,
} from '../../../domain/repositories/owner-listing-media.repository.js';
import type { ListingPhotoFile, ListingPhotoStorage } from '../../ports/listing-photo-storage.port.js';

export const MAX_LISTING_PHOTOS = 10;

// Status em que o anúncio está, ou pode voltar a estar sem moderação, na
// busca pública: aprovado, ou arquivado (o dono restaura direto para
// aprovado). Foto nova nesses casos manda o anúncio de volta para a fila.
const PUBLISHED_WITHOUT_REVIEW: readonly ListingStatus[] = [
  ListingStatus.APPROVED,
  ListingStatus.ARCHIVED,
];

interface ListingRef {
  userId: string;
  listingId: string;
}

// O dono de um anúncio consulta, adiciona, remove e reordena as fotos. O
// anúncio fica sempre com 1 a 10 fotos; a primeira é a capa. Fotos novas
// passam pela moderação; remover ou reordenar não muda o status.
export class ManageListingPhotosUseCase {
  constructor(
    private readonly media: OwnerListingMediaRepository,
    private readonly storage: ListingPhotoStorage,
    private readonly logger: Logger,
  ) {}

  async list({ userId, listingId }: ListingRef): Promise<ListingPhotos> {
    const listing = await this.media.findOwnedMedia(userId, listingId);
    if (listing === null) throw new ListingNotFoundError();
    return listing;
  }

  async add(input: ListingRef & { files: ListingPhotoFile[] }): Promise<ListingPhotos> {
    if (input.files.length === 0 || input.files.length > MAX_LISTING_PHOTOS) {
      throw new InvalidListingPhotoCountError('Envie de 1 a 10 fotos.');
    }
    // Falha cedo, antes de gravar arquivos, se o anúncio não for do usuário
    // ou já estiver cheio. A conferência que vale é a de dentro da transação.
    const current = await this.list(input);
    ensureRoomFor(current.photos, input.files.length);

    const urls = await this.storage.storeFiles(input.files);
    const added: ListingPhoto[] = urls.map((url) => ({
      id: randomUUID(),
      type: MediaType.PHOTO,
      url,
      position: 0,
    }));

    try {
      const listing = await this.media.updateOwnedMedia(input.userId, input.listingId, (state) => {
        ensureRoomFor(state.photos, added.length);
        return {
          photos: [...state.photos, ...added],
          status: PUBLISHED_WITHOUT_REVIEW.includes(state.status)
            ? ListingStatus.PENDING
            : state.status,
        };
      });
      if (listing === null) throw new ListingNotFoundError();
      return listing;
    } catch (error) {
      await this.removeQuietly(urls, input.listingId);
      throw error;
    }
  }

  async remove(input: ListingRef & { photoId: string }): Promise<ListingPhotos> {
    let removed: ListingPhoto | undefined;
    const listing = await this.media.updateOwnedMedia(input.userId, input.listingId, (state) => {
      removed = state.photos.find((photo) => photo.id === input.photoId);
      if (!removed) throw new ListingPhotoNotFoundError();
      if (state.photos.length === 1) {
        throw new InvalidListingPhotoCountError(
          'O anúncio precisa ter ao menos uma foto. Adicione outra antes de remover esta.',
        );
      }
      return { ...state, photos: state.photos.filter((photo) => photo.id !== input.photoId) };
    });
    if (listing === null) throw new ListingNotFoundError();

    if (removed) await this.removeQuietly([removed.url], input.listingId);
    return listing;
  }

  async reorder(input: ListingRef & { photoIds: string[] }): Promise<ListingPhotos> {
    const listing = await this.media.updateOwnedMedia(input.userId, input.listingId, (state) => {
      const byId = new Map(state.photos.map((photo) => [photo.id, photo]));
      const unique = new Set(input.photoIds);
      if (
        unique.size !== input.photoIds.length ||
        input.photoIds.length !== state.photos.length ||
        !input.photoIds.every((id) => byId.has(id))
      ) {
        throw new InvalidListingPhotoOrderError();
      }
      return { ...state, photos: input.photoIds.map((id) => byId.get(id)!) };
    });
    if (listing === null) throw new ListingNotFoundError();
    return listing;
  }

  // O banco já está certo; um arquivo que sobrou no disco não deve virar erro
  // para o usuário.
  private async removeQuietly(urls: string[], listingId: string): Promise<void> {
    try {
      await this.storage.removeFiles(urls);
    } catch (error) {
      this.logger.error(`Falha ao apagar fotos do anúncio ${listingId}.`, error);
    }
  }
}

function ensureRoomFor(current: ListingPhoto[], adding: number): void {
  if (current.length + adding > MAX_LISTING_PHOTOS) {
    const left = MAX_LISTING_PHOTOS - current.length;
    throw new InvalidListingPhotoCountError(
      left === 0
        ? 'O anúncio já tem 10 fotos. Remova alguma antes de adicionar outras.'
        : `O anúncio aceita no máximo 10 fotos: você ainda pode adicionar ${left}.`,
    );
  }
}
