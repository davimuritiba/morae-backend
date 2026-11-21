import {
  ListingDirectory,
  type ChatListing,
} from '../../application/ports/listing-directory.port.js';

export class FakeListingDirectory extends ListingDirectory {
  readonly approved = new Map<string, ChatListing>();

  add(listing: ChatListing): ChatListing {
    this.approved.set(listing.id, listing);
    return listing;
  }

  findApprovedById(listingId: string): Promise<ChatListing | null> {
    return Promise.resolve(this.approved.get(listingId) ?? null);
  }
}
