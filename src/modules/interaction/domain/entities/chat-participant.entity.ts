import { ParticipantRole } from '../enums/participant-role.enum.js';

export interface ChatParticipantProps {
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
  lastReadAt: Date | null;
}

export interface CreateChatParticipantProps {
  userId: string;
  role: ParticipantRole;
  joinedAt: Date;
}

export class ChatParticipant {
  readonly #props: ChatParticipantProps;

  private constructor(props: ChatParticipantProps) {
    this.#props = props;
  }

  static create(input: CreateChatParticipantProps): ChatParticipant {
    if (input.userId.length === 0) {
      throw new Error('userId é obrigatório.');
    }

    return new ChatParticipant({
      userId: input.userId,
      role: input.role,
      joinedAt: copyDate(input.joinedAt),
      lastReadAt: null,
    });
  }

  static restore(props: ChatParticipantProps): ChatParticipant {
    return new ChatParticipant({
      ...props,
      joinedAt: copyDate(props.joinedAt),
      lastReadAt: props.lastReadAt ? copyDate(props.lastReadAt) : null,
    });
  }

  get userId(): string {
    return this.#props.userId;
  }

  get role(): ParticipantRole {
    return this.#props.role;
  }

  get isAdmin(): boolean {
    return this.#props.role === ParticipantRole.ADMIN;
  }

  get joinedAt(): Date {
    return copyDate(this.#props.joinedAt);
  }

  get lastReadAt(): Date | null {
    return this.#props.lastReadAt ? copyDate(this.#props.lastReadAt) : null;
  }

  markAsRead(at: Date): void {
    const current = this.#props.lastReadAt;
    if (current !== null && current.getTime() >= at.getTime()) return;
    this.#props.lastReadAt = copyDate(at);
  }
}

function copyDate(value: Date): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error('Data inválida.');
  }
  return new Date(value.getTime());
}
