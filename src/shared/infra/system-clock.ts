import { Injectable } from '@nestjs/common';
import { Clock } from '../application/clock.js';

// Relógio real da aplicação.
@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
