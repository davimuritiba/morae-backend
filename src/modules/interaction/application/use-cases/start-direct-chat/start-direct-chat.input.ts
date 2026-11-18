export type StartDirectChatInput =
  | { actorId: string; targetUserId: string }
  | { actorId: string; listingId: string };
