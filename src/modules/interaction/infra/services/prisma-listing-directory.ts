import { Injectable } from '@nestjs/common';
import { PrismaTransactionContext } from '../../../../shared/infra/database/prisma-transaction-context.js';
import { isUuid } from '../../../../shared/infra/database/uuid.js';
import {
  ListingDirectory,
  type ChatListing,
} from '../../application/ports/listing-directory.port.js';

@Injectable()
export class PrismaListingDirectory extends ListingDirectory {
  constructor(private readonly db: PrismaTransactionContext) {
    super();
  }

  async findApprovedById(listingId: string): Promise<ChatListing | null> {
    if (!isUuid(listingId)) return null;

    const row = await this.db.client.listing.findFirst({
      where: { id: listingId, status: 'APPROVED' },
      select: {
        id: true,
        property: { select: { owner: { select: { userId: true } } } },
      },
    });
    return row ? { id: row.id, ownerUserId: row.property.owner.userId } : null;
  }
}
