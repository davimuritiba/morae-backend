export interface ChatUser {
  id: string;
  emailVerified: boolean;
  active: boolean;
}

export abstract class ChatUserDirectory {
  abstract findById(userId: string): Promise<ChatUser | null>;
  // Ids inexistentes ficam de fora do resultado.
  abstract findByIds(userIds: string[]): Promise<ChatUser[]>;
}
