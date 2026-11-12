import { Clock } from '../../application/clock.js';

// Relógio parado no horário informado; avança só quando o teste pede.
export class FixedClock extends Clock {
  #current: Date;

  constructor(start: Date) {
    super();
    this.#current = new Date(start.getTime());
  }

  now(): Date {
    return new Date(this.#current.getTime());
  }

  advance(ms: number): void {
    this.#current = new Date(this.#current.getTime() + ms);
  }
}
