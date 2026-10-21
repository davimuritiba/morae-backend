import { InvalidEmailError } from '../errors/invalid-email.error.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTH = 254;

export class Email {
  private constructor(private readonly _value: string) {}

  static create(raw: string): Email {
    const value = raw.trim().toLowerCase();

    if (value.length > MAX_LENGTH || !EMAIL_REGEX.test(value)) {
      throw new InvalidEmailError();
    }

    return new Email(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
