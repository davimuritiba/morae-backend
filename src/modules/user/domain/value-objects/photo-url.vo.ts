import { InvalidPhotoUrlError } from '../errors/invalid-photo-url.error.js';

// Mesmo limite da coluna users.photo_url (VARCHAR(2048)).
const MAX_LENGTH = 2048;

export class PhotoUrl {
  private constructor(private readonly _value: string) {}

  static create(raw: string): PhotoUrl {
    const input = raw.trim();

    if (input.length > MAX_LENGTH || !URL.canParse(input)) {
      throw new InvalidPhotoUrlError();
    }

    const url = new URL(input);

    // Só https: bloqueia javascript:, data:, file: e afins, que viram XSS no
    // front ou SSRF se o backend buscar a imagem. Credenciais na URL também
    // não são aceitas.
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new InvalidPhotoUrlError();
    }

    // O valor guardado é o href normalizado, que pode ficar maior que o texto
    // recebido: acentos e espaços viram percent-encoding ("é" → "%C3%A9").
    if (url.href.length > MAX_LENGTH) {
      throw new InvalidPhotoUrlError();
    }

    return new PhotoUrl(url.href);
  }

  get value(): string {
    return this._value;
  }

  equals(other: PhotoUrl): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
