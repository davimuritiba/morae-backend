import { InvalidPhoneError } from '../errors/invalid-phone.error.js';

// Aceita dígitos com pontuação comum: "(82) 99999-9999", "+55 82 3333-4444".
const PHONE_INPUT_REGEX = /^\+?[\d\s().-]{10,20}$/;
// DDD + celular (9 + 8 dígitos) ou fixo (começa com 2 a 5, 8 dígitos).
const PHONE_DIGITS_REGEX = /^[1-9]{2}(9\d{8}|[2-5]\d{7})$/;
const COUNTRY_CODE = '55';

export class Phone {
  private constructor(private readonly _value: string) {}

  static create(raw: string): Phone {
    const input = raw.trim();

    if (!PHONE_INPUT_REGEX.test(input)) {
      throw new InvalidPhoneError();
    }

    let digits = input.replace(/\D/g, '');
    if (digits.length > 11 && digits.startsWith(COUNTRY_CODE)) {
      digits = digits.slice(COUNTRY_CODE.length);
    }

    if (!PHONE_DIGITS_REGEX.test(digits)) {
      throw new InvalidPhoneError();
    }

    return new Phone(digits);
  }

  // Apenas DDD + número, sem pontuação e sem o código do país.
  get value(): string {
    return this._value;
  }

  equals(other: Phone): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
