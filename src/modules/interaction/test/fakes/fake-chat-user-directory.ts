import {
  ChatUserDirectory,
  type ChatUser,
} from '../../application/ports/chat-user-directory.port.js';

export class FakeChatUserDirectory extends ChatUserDirectory {
  readonly users = new Map<string, ChatUser>();

  add(user: Partial<ChatUser> & { id: string }): ChatUser {
    const added = { emailVerified: true, active: true, ...user };
    this.users.set(added.id, added);
    return added;
  }

  findById(userId: string): Promise<ChatUser | null> {
    return Promise.resolve(this.users.get(userId) ?? null);
  }

  findByIds(userIds: string[]): Promise<ChatUser[]> {
    return Promise.resolve(
      userIds.flatMap((id) => {
        const user = this.users.get(id);
        return user ? [user] : [];
      }),
    );
  }
}
