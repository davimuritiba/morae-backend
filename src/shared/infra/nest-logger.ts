import { Logger as NestLogger } from '@nestjs/common';
import { Logger } from '../application/logger.js';

// Implementa o Logger da aplicação com o logger do Nest.
export class NestLoggerAdapter extends Logger {
  readonly #logger: NestLogger;

  constructor(context: string) {
    super();
    this.#logger = new NestLogger(context);
  }

  error(message: string, error?: unknown): void {
    const detail = error instanceof Error ? error.stack : String(error);
    this.#logger.error(message, detail);
  }
}
