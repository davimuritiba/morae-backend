import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../../shared/infra/database/generated/prisma/client.js';
import {
  ListingStatus as PrismaListingStatus,
  MediaType as PrismaMediaType,
} from '../../../../../shared/infra/database/generated/prisma/client.js';
import { PrismaService } from '../../../../../shared/infra/database/prisma.service.js';
import { ListingStatus } from '../../../domain/enums/listing-status.enum.js';
import { MediaType } from '../../../domain/enums/media-type.enum.js';
import {
  OwnerListingMediaRepository,
  type ListingPhoto,
  type ListingPhotos,
} from '../../../domain/repositories/owner-listing-media.repository.js';

const toPhoto = (row: { id: string; type: string; url: string; position: number }): ListingPhoto => ({
  id: row.id,
  type: row.type as MediaType,
  url: row.url,
  position: row.position,
});

@Injectable()
export class PrismaOwnerListingMediaRepository extends OwnerListingMediaRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findOwnedMedia(userId: string, listingId: string): Promise<ListingPhotos | null> {
    const listing = await this.prisma.listing.findFirst({
      where: {
        id: listingId,
        status: { not: 'REMOVED' },
        property: { is: { owner: { is: { userId } } } },
      },
      select: { status: true, media: { orderBy: { position: 'asc' } } },
    });
    return listing
      ? { status: listing.status as ListingStatus, photos: listing.media.map(toPhoto) }
      : null;
  }

  async updateOwnedMedia(
    userId: string,
    listingId: string,
    change: (current: ListingPhotos) => ListingPhotos,
  ): Promise<ListingPhotos | null> {
    return this.prisma.$transaction(async (tx) => {
      // Trava o anúncio: outra edição de fotos espera esta terminar.
      const owned = await tx.$queryRaw<{ status: PrismaListingStatus }[]>`
        SELECT l.status
          FROM listings l
          JOIN properties p ON p.id = l.property_id
          JOIN property_owners o ON o.id = p.owner_id
         WHERE l.id = ${listingId}::uuid
           AND o.user_id = ${userId}::uuid
           AND l.status <> 'REMOVED'
           FOR UPDATE OF l`;
      if (owned.length === 0) return null;

      const rows = await tx.listingMedia.findMany({
        where: { listingId },
        orderBy: { position: 'asc' },
      });
      const current = rows.map(toPhoto);
      const changed = change({ status: owned[0].status as ListingStatus, photos: current });
      const next = changed.photos.map((photo, position) => ({ ...photo, position }));

      await this.applyChange(tx, listingId, current, next);
      await tx.listing.update({
        where: { id: listingId },
        data: { status: changed.status as PrismaListingStatus, updatedAt: new Date() },
      });
      return { status: changed.status, photos: next };
    });
  }

  private async applyChange(
    tx: Prisma.TransactionClient,
    listingId: string,
    current: ListingPhoto[],
    next: ListingPhoto[],
  ): Promise<void> {
    const currentIds = new Set(current.map((photo) => photo.id));
    const nextIds = next.map((photo) => photo.id);

    await tx.listingMedia.deleteMany({ where: { listingId, id: { notIn: nextIds } } });

    // (listing_id, position) é único: as fotos que ficam passam por posições
    // negativas antes de receber a posição final, para não colidirem no meio.
    const kept = next.filter((photo) => currentIds.has(photo.id));
    for (const [index, photo] of kept.entries()) {
      await tx.listingMedia.update({ where: { id: photo.id }, data: { position: -(index + 1) } });
    }

    for (const photo of next) {
      if (currentIds.has(photo.id)) {
        await tx.listingMedia.update({ where: { id: photo.id }, data: { position: photo.position } });
      } else {
        await tx.listingMedia.create({
          data: {
            id: photo.id,
            listingId,
            type: photo.type as PrismaMediaType,
            url: photo.url,
            position: photo.position,
          },
        });
      }
    }
  }
}
