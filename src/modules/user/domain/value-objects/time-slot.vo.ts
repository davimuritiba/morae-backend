import { InvalidTimeSlotError } from '../errors/invalid-time-slot.error.js';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class TimeSlot {
  private constructor(
    private readonly _start: string,
    private readonly _end: string,
  ) {}

  // Horários no formato "HH:mm". Com zero à esquerda, a comparação de
  // strings equivale à comparação de horários.
  static create(start: string, end: string): TimeSlot {
    if (!TIME_REGEX.test(start) || !TIME_REGEX.test(end) || start >= end) {
      throw new InvalidTimeSlotError();
    }

    return new TimeSlot(start, end);
  }

  get start(): string {
    return this._start;
  }

  get end(): string {
    return this._end;
  }

  equals(other: TimeSlot): boolean {
    return this._start === other._start && this._end === other._end;
  }
}
