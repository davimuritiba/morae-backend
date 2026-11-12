import { Logger } from '../../application/logger.js';

// Guarda o que foi registrado para os testes inspecionarem.
export class FakeLogger extends Logger {
  readonly errors: { message: string; error?: unknown }[] = [];

  error(message: string, error?: unknown): void {
    this.errors.push({ message, error });
  }
}
