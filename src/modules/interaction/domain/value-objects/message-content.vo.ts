import { InvalidMessageContentError } from '../errors/invalid-message-content.error.js';

export const MESSAGE_CONTENT_MAX_LENGTH = 2000;

export class MessageContent {
  private constructor(private readonly _value: string) {}

  static create(raw: string): MessageContent {
    const value = raw.trim();
    // Conta code points, como o VARCHAR do PostgreSQL.
    const length = Array.from(value).length;

    if (
      length === 0 ||
      length > MESSAGE_CONTENT_MAX_LENGTH ||
      value.includes('\u0000')
    ) {
      throw new InvalidMessageContentError(MESSAGE_CONTENT_MAX_LENGTH);
    }

    return new MessageContent(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: MessageContent): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
