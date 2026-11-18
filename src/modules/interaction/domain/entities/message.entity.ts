import { randomUUID } from 'node:crypto';
import { EmptyMessageError } from '../errors/empty-message.error.js';
import type { MessageContent } from '../value-objects/message-content.vo.js';

export interface MessageProps {
  chatId: string;
  senderId: string;
  content: MessageContent | null;
  listingId: string | null;
  createdAt: Date;
}

export interface CreateMessageProps {
  chatId: string;
  senderId: string;
  content?: MessageContent | null;
  listingId?: string | null;
  sentAt: Date;
}

export class Message {
  readonly #id: string;
  readonly #props: MessageProps;

  private constructor(id: string, props: MessageProps) {
    this.#id = id;
    this.#props = props;
  }

  static create(input: CreateMessageProps): Message {
    if (input.chatId.length === 0 || input.senderId.length === 0) {
      throw new Error('chatId e senderId são obrigatórios.');
    }
    if (!isValidDate(input.sentAt)) {
      throw new Error('sentAt precisa ser uma data válida.');
    }

    const content = input.content ?? null;
    const listingId = input.listingId || null;

    if (content === null && listingId === null) {
      throw new EmptyMessageError();
    }

    return new Message(randomUUID(), {
      chatId: input.chatId,
      senderId: input.senderId,
      content,
      listingId,
      createdAt: new Date(input.sentAt.getTime()),
    });
  }

  static restore(id: string, props: MessageProps): Message {
    return new Message(id, {
      ...props,
      createdAt: new Date(props.createdAt.getTime()),
    });
  }

  get id(): string {
    return this.#id;
  }

  get chatId(): string {
    return this.#props.chatId;
  }

  get senderId(): string {
    return this.#props.senderId;
  }

  get content(): MessageContent | null {
    return this.#props.content;
  }

  get listingId(): string | null {
    return this.#props.listingId;
  }

  get createdAt(): Date {
    return new Date(this.#props.createdAt.getTime());
  }

  isSentBy(userId: string): boolean {
    return this.#props.senderId === userId;
  }
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
