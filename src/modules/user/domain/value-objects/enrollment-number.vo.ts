import { InvalidEnrollmentNumberError } from '../errors/invalid-enrollment-number.error.js';

// Formato provisório: somente dígitos, de 6 a 15 caracteres.
// Ajustar quando o padrão oficial de matrícula da UFAL for confirmado.
const ENROLLMENT_NUMBER_REGEX = /^\d{6,15}$/;

export class EnrollmentNumber {
  private constructor(private readonly _value: string) {}

  static create(raw: string): EnrollmentNumber {
    const value = raw.trim();

    if (!ENROLLMENT_NUMBER_REGEX.test(value)) {
      throw new InvalidEnrollmentNumberError();
    }

    return new EnrollmentNumber(value);
  }

  get value(): string {
    return this._value;
  }

  equals(other: EnrollmentNumber): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
