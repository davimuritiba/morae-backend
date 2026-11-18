import { InvalidGroupNameError } from '../errors/invalid-group-name.error.js';

export const GROUP_NAME_MAX_LENGTH = 60;

const CONTROL_CHARACTER_REGEX = /\p{Cc}/u;

export class GroupName {
  private constructor(private readonly _value: string) {}

  static create(raw: string): GroupName {
    const value = raw.trim();
    const length = Array.from(value).length;

    if (
      length === 0 ||
      length > GROUP_NAME_MAX_LENGTH ||
      CONTROL_CHARACTER_REGEX.test(value)
    ) {
      throw new InvalidGroupNameError(GROUP_NAME_MAX_LENGTH);
    }

    return new GroupName(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: GroupName): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
