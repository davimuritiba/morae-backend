import { InvalidPreferenceLevelError } from '../errors/invalid-preference-level.error.js';

export class PreferenceLevel {
  static readonly MIN = 1;
  static readonly MAX = 5;

  private constructor(private readonly _value: number) {}

  static create(value: number): PreferenceLevel {
    if (
      !Number.isInteger(value) ||
      value < PreferenceLevel.MIN ||
      value > PreferenceLevel.MAX
    ) {
      throw new InvalidPreferenceLevelError(
        PreferenceLevel.MIN,
        PreferenceLevel.MAX,
      );
    }

    return new PreferenceLevel(value);
  }

  get value(): number {
    return this._value;
  }

  equals(other: PreferenceLevel): boolean {
    return this._value === other._value;
  }
}
