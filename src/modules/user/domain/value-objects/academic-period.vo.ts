import { InvalidAcademicPeriodError } from '../errors/invalid-academic-period.error.js';

export class AcademicPeriod {
  static readonly MIN = 1;
  // Acima da duração regular dos cursos, para cobrir alunos atrasados.
  static readonly MAX = 20;

  private constructor(private readonly _value: number) {}

  static create(value: number): AcademicPeriod {
    if (
      !Number.isInteger(value) ||
      value < AcademicPeriod.MIN ||
      value > AcademicPeriod.MAX
    ) {
      throw new InvalidAcademicPeriodError(
        AcademicPeriod.MIN,
        AcademicPeriod.MAX,
      );
    }

    return new AcademicPeriod(value);
  }

  get value(): number {
    return this._value;
  }

  equals(other: AcademicPeriod): boolean {
    return this._value === other._value;
  }
}
