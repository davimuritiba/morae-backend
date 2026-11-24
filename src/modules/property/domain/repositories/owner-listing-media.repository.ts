import type { MediaType } from '../enums/media-type.enum.js';
import type { ListingStatus } from '../enums/listing-status.enum.js';

export interface ListingPhoto {
  id: string;
  type: MediaType;
  url: string;
  position: number;
}

// Fotos de um anúncio junto com o status dele.
export interface ListingPhotos {
  status: ListingStatus;
  photos: ListingPhoto[];
}

// Fotos de um anúncio vistas pelo dono dele.
export abstract class OwnerListingMediaRepository {
  // null se o anúncio não existe, foi removido ou não é do usuário.
  abstract findOwnedMedia(userId: string, listingId: string): Promise<ListingPhotos | null>;

  // Aplica `change` sobre as fotos e o status atuais com o anúncio travado,
  // para duas edições simultâneas não se sobreporem. O que `change` devolve
  // vira o novo estado: as fotos na ordem dada (as posições são refeitas) e o
  // status. `change` pode lançar um erro de domínio para cancelar a alteração.
  // Devolve null nos mesmos casos de findOwnedMedia.
  abstract updateOwnedMedia(
    userId: string,
    listingId: string,
    change: (current: ListingPhotos) => ListingPhotos,
  ): Promise<ListingPhotos | null>;
}
