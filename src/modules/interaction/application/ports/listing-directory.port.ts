export interface ChatListing {
  id: string;
  ownerUserId: string;
}

export abstract class ListingDirectory {
  // Só anúncios APPROVED; os demais voltam como null.
  abstract findApprovedById(listingId: string): Promise<ChatListing | null>;
}
