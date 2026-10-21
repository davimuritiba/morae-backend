import { InvalidCpfError } from '../errors/invalid-cpf.error.js';

// Aceita "00000000000" ou "000.000.000-00".
const CPF_INPUT_REGEX = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

export class Cpf {
  private constructor(private readonly _value: string) {}

  static create(raw: string): Cpf {
    const input = raw.trim();

    if (!CPF_INPUT_REGEX.test(input)) {
      throw new InvalidCpfError();
    }

    const digits = input.replace(/\D/g, '');

    if (!Cpf.hasValidCheckDigits(digits)) {
      throw new InvalidCpfError();
    }

    return new Cpf(digits);
  }

  // Apenas os 11 dígitos, sem pontuação.
  get value(): string {
    return this._value;
  }

  formatted(): string {
    return this._value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  equals(other: Cpf): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }

  private static hasValidCheckDigits(digits: string): boolean {
    // Sequências como 111.111.111-11 passam no cálculo, mas não são CPFs válidos.
    if (/^(\d)\1{10}$/.test(digits)) return false;

    return (
      Cpf.checkDigit(digits, 9) === Number(digits[9]) &&
      Cpf.checkDigit(digits, 10) === Number(digits[10])
    );
  }

  // Calcula o dígito verificador a partir dos `length` primeiros dígitos.
  private static checkDigit(digits: string, length: number): number {
    let sum = 0;
    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * (length + 1 - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  }
}
