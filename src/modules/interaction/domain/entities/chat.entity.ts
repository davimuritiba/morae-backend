import { randomUUID } from 'node:crypto';
import { ChatType } from '../enums/chat-type.enum.js';
import { ParticipantRole } from '../enums/participant-role.enum.js';
import { CannotChatWithYourselfError } from '../errors/cannot-chat-with-yourself.error.js';
import { ChatNotFoundError } from '../errors/chat-not-found.error.js';
import { InvalidGroupSizeError } from '../errors/invalid-group-size.error.js';
import type { GroupName } from '../value-objects/group-name.vo.js';
import { ChatParticipant } from './chat-participant.entity.js';
import type { Message } from './message.entity.js';

export const GROUP_MIN_PARTICIPANTS = 3;
export const GROUP_MAX_PARTICIPANTS = 50;

export interface ChatProps {
  type: ChatType;
  name: GroupName | null;
  createdBy: string;
  directKey: string | null;
  participants: ChatParticipant[];
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDirectChatProps {
  userId: string;
  otherUserId: string;
  now: Date;
}

export interface CreateGroupChatProps {
  creatorId: string;
  name: GroupName;
  memberIds: string[];
  now: Date;
}

export class Chat {
  readonly #id: string;
  readonly #props: ChatProps;

  private constructor(id: string, props: ChatProps) {
    this.#id = id;
    this.#props = props;
  }

  static createDirect(input: CreateDirectChatProps): Chat {
    if (input.userId === input.otherUserId) {
      throw new CannotChatWithYourselfError();
    }

    const participants = [input.userId, input.otherUserId].map((userId) =>
      ChatParticipant.create({
        userId,
        role: ParticipantRole.MEMBER,
        joinedAt: input.now,
      }),
    );

    return new Chat(randomUUID(), {
      type: ChatType.DIRECT,
      name: null,
      createdBy: input.userId,
      directKey: Chat.directKeyFor(input.userId, input.otherUserId),
      participants,
      lastMessageAt: null,
      createdAt: copyDate(input.now),
      updatedAt: copyDate(input.now),
    });
  }

  static createGroup(input: CreateGroupChatProps): Chat {
    const memberIds = [...new Set(input.memberIds)].filter(
      (id) => id !== input.creatorId,
    );
    const size = memberIds.length + 1;

    if (size < GROUP_MIN_PARTICIPANTS || size > GROUP_MAX_PARTICIPANTS) {
      throw new InvalidGroupSizeError(
        GROUP_MIN_PARTICIPANTS,
        GROUP_MAX_PARTICIPANTS,
      );
    }

    const participants = [
      ChatParticipant.create({
        userId: input.creatorId,
        role: ParticipantRole.ADMIN,
        joinedAt: input.now,
      }),
      ...memberIds.map((userId) =>
        ChatParticipant.create({
          userId,
          role: ParticipantRole.MEMBER,
          joinedAt: input.now,
        }),
      ),
    ];

    return new Chat(randomUUID(), {
      type: ChatType.GROUP,
      name: input.name,
      createdBy: input.creatorId,
      directKey: null,
      participants,
      lastMessageAt: null,
      createdAt: copyDate(input.now),
      updatedAt: copyDate(input.now),
    });
  }

  static restore(id: string, props: ChatProps): Chat {
    return new Chat(id, {
      ...props,
      participants: [...props.participants],
      lastMessageAt: props.lastMessageAt ? copyDate(props.lastMessageAt) : null,
      createdAt: copyDate(props.createdAt),
      updatedAt: copyDate(props.updatedAt),
    });
  }

  static directKeyFor(userId: string, otherUserId: string): string {
    return [userId, otherUserId].sort().join(':');
  }

  get id(): string {
    return this.#id;
  }

  get type(): ChatType {
    return this.#props.type;
  }

  get name(): GroupName | null {
    return this.#props.name;
  }

  get createdBy(): string {
    return this.#props.createdBy;
  }

  get directKey(): string | null {
    return this.#props.directKey;
  }

  get participants(): readonly ChatParticipant[] {
    return [...this.#props.participants];
  }

  get lastMessageAt(): Date | null {
    return this.#props.lastMessageAt
      ? copyDate(this.#props.lastMessageAt)
      : null;
  }

  get createdAt(): Date {
    return copyDate(this.#props.createdAt);
  }

  get updatedAt(): Date {
    return copyDate(this.#props.updatedAt);
  }

  hasParticipant(userId: string): boolean {
    return this.findParticipant(userId) !== null;
  }

  findParticipant(userId: string): ChatParticipant | null {
    return this.#props.participants.find((p) => p.userId === userId) ?? null;
  }

  markAsRead(userId: string, now: Date): void {
    this.requireParticipant(userId).markAsRead(now);
  }

  registerMessage(message: Message): void {
    if (message.chatId !== this.#id) {
      throw new Error('A mensagem pertence a outra conversa.');
    }

    const sender = this.requireParticipant(message.senderId);
    const sentAt = message.createdAt;

    sender.markAsRead(sentAt);

    const last = this.#props.lastMessageAt;
    if (last === null || sentAt.getTime() > last.getTime()) {
      this.#props.lastMessageAt = sentAt;
      this.#props.updatedAt = copyDate(sentAt);
    }
  }

  private requireParticipant(userId: string): ChatParticipant {
    const participant = this.findParticipant(userId);
    if (participant === null) {
      throw new ChatNotFoundError();
    }
    return participant;
  }
}

function copyDate(value: Date): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error('Data inválida.');
  }
  return new Date(value.getTime());
}
