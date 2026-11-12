import { randomUUID } from 'node:crypto';
import { MediaType } from '../enums/media-type.enum.js';

export interface ListingMediaProps {
  type: MediaType;
  url: string;
  position: number;
  createdAt: Date;
}

export interface CreateListingMediaProps {
  type: MediaType;
  url: string;
  position: number;
}

export class ListingMedia {
  readonly #id: string;
  readonly #props: ListingMediaProps;

  private constructor(id: string, props: ListingMediaProps) {
    this.#id = id;
    this.#props = props;
  }

  static create(input: CreateListingMediaProps): ListingMedia {
    if (!input.url.trim() || input.url.length > 2048) throw new Error('URL da mídia inválida.');
    if (!Number.isInteger(input.position) || input.position < 0) throw new Error('Posição da mídia inválida.');
    return new ListingMedia(randomUUID(), { ...input, url: input.url.trim(), createdAt: new Date() });
  }

  static restore(id: string, props: ListingMediaProps): ListingMedia {
    return new ListingMedia(id, { ...props });
  }

  get id(): string { return this.#id; }
  get type(): MediaType { return this.#props.type; }
  get url(): string { return this.#props.url; }
  get position(): number { return this.#props.position; }
  get createdAt(): Date { return this.#props.createdAt; }
}
