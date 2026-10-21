import { InvalidBudgetRangeError } from '../errors/invalid-budget-range.error.js';

export class BudgetRange {
  private constructor(
    private readonly _min: number,
    private readonly _max: number,
  ) {}

  static create(min: number, max: number): BudgetRange {
    if (
      !Number.isFinite(min) ||
      !Number.isFinite(max) ||
      min < 0 ||
      min > max
    ) {
      throw new InvalidBudgetRangeError();
    }

    return new BudgetRange(min, max);
  }

  get min(): number {
    return this._min;
  }

  get max(): number {
    return this._max;
  }

  contains(value: number): boolean {
    return value >= this._min && value <= this._max;
  }

  equals(other: BudgetRange): boolean {
    return this._min === other._min && this._max === other._max;
  }
}
