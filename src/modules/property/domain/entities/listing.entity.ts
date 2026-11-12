import { randomUUID } from 'node:crypto';
import { ContractType } from '../enums/contract-type.enum.js';
import { ListingStatus } from '../enums/listing-status.enum.js';
import { MinimumStay } from '../enums/minimum-stay.enum.js';
import { InvalidPropertyFieldError } from '../errors/invalid-property-field.error.js';
import { ListingMedia } from './listing-media.entity.js';

export interface ListingProps {
  title: string;
  description: string;
  rules: string | null;
  rent: number;
  condominium: number | null;
  contractType: ContractType;
  minimumStay: MinimumStay;
  status: ListingStatus;
  media: ListingMedia[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateListingProps {
  title: string;
  description: string;
  rules?: string | null;
  rent: number;
  condominium?: number | null;
  contractType: ContractType;
  minimumStay: MinimumStay;
  media?: ListingMedia[];
}

export class Listing {
  readonly #id: string;
  readonly #props: ListingProps;

  private constructor(id: string, props: ListingProps) {
    this.#id = id;
    this.#props = props;
  }

  static create(input: CreateListingProps): Listing {
    const title = input.title.trim();
    const description = input.description.trim();
    if (!title || title.length > 90) throw new InvalidPropertyFieldError('title', 'Título inválido.');
    if (!description || description.length > 1000) throw new InvalidPropertyFieldError('description', 'Descrição inválida.');
    Listing.validateMoney(input.rent, 'rent', false);
    if (input.condominium !== null && input.condominium !== undefined) Listing.validateMoney(input.condominium, 'condominium', true);
    const media = input.media ?? [];
    if (media.filter((item) => item.type === 'PHOTO').length > 10) throw new InvalidPropertyFieldError('media', 'Máximo de 10 fotos.');
    const now = new Date();
    return new Listing(randomUUID(), {
      title, description, rules: input.rules?.trim() || null, rent: input.rent,
      condominium: input.condominium ?? null, contractType: input.contractType,
      minimumStay: input.minimumStay, status: ListingStatus.PENDING, media: [...media],
      createdAt: now, updatedAt: now,
    });
  }

  static restore(id: string, props: ListingProps): Listing {
    return new Listing(id, { ...props, media: [...props.media] });
  }

  get id(): string { return this.#id; }
  get title(): string { return this.#props.title; }
  get description(): string { return this.#props.description; }
  get rules(): string | null { return this.#props.rules; }
  get rent(): number { return this.#props.rent; }
  get condominium(): number | null { return this.#props.condominium; }
  get contractType(): ContractType { return this.#props.contractType; }
  get minimumStay(): MinimumStay { return this.#props.minimumStay; }
  get status(): ListingStatus { return this.#props.status; }
  get media(): readonly ListingMedia[] { return this.#props.media; }
  get createdAt(): Date { return this.#props.createdAt; }
  get updatedAt(): Date { return this.#props.updatedAt; }

  private static validateMoney(value: number, field: string, zero: boolean): void {
    if (!Number.isFinite(value) || (!zero && value <= 0) || (zero && value < 0)) throw new InvalidPropertyFieldError(field, `Valor de ${field} inválido.`);
  }
}
