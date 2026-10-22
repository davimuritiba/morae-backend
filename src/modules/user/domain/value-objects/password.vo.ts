import { InvalidPasswordError } from '../errors/invalid-password.error.js';

// Senha em texto puro, usada só de passagem (validar e gerar o hash).
// Nunca é guardada na entidade nem persistida.
export class Password {
  static readonly MIN_LENGTH = 8;
  static readonly MAX_LENGTH = 128;

  // Campo privado de verdade (#): serializar o objeto não expõe a senha.
  readonly #value: string;

  private constructor(value: string) {
    this.#value = value;
  }

  // Sem trim: espaços fazem parte da senha que o usuário escolheu.
  static create(raw: string): Password {
    if (raw.length < Password.MIN_LENGTH || raw.length > Password.MAX_LENGTH) {
      throw new InvalidPasswordError(Password.MIN_LENGTH, Password.MAX_LENGTH);
    }

    return new Password(raw);
  }

  get value(): string {
    return this.#value;
  }
}
