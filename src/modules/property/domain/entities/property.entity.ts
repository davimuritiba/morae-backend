import { randomUUID } from 'node:crypto';
import { HousingType } from '../enums/housing-type.enum.js';
import { InvalidPropertyFieldError } from '../errors/invalid-property-field.error.js';
import { Listing } from './listing.entity.js';
import { Residence } from './residence.entity.js';

export interface PropertyProps {
  ownerId: string;
  residence: Residence;
  housingType: HousingType;
  bedrooms: number;
  bathrooms: number;
  parkingSpaces: number;
  amenities: string[];
  listing: Listing;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePropertyProps extends Omit<PropertyProps, 'listing' | 'createdAt' | 'updatedAt'> {
  listing: Listing;
}

export class Property {
  readonly #id: string;
  readonly #props: PropertyProps;

  private constructor(id: string, props: PropertyProps) {
    this.#id = id;
    this.#props = props;
  }

  static create(input: CreatePropertyProps): Property {
    if (!input.ownerId.trim()) throw new InvalidPropertyFieldError('ownerId', 'Proprietário inválido.');
    Property.validateCount(input.bedrooms, 'bedrooms');
    Property.validateCount(input.bathrooms, 'bathrooms');
    Property.validateCount(input.parkingSpaces, 'parkingSpaces', true);
    const amenities = [...new Set(input.amenities.map((item) => item.trim()).filter(Boolean))];
    const now = new Date();
    return new Property(randomUUID(), { ...input, amenities, createdAt: now, updatedAt: now });
  }

  static restore(id: string, props: PropertyProps): Property {
    return new Property(id, { ...props, amenities: [...props.amenities] });
  }

  get id(): string { return this.#id; }
  get ownerId(): string { return this.#props.ownerId; }
  get residence(): Residence { return this.#props.residence; }
  get housingType(): HousingType { return this.#props.housingType; }
  get bedrooms(): number { return this.#props.bedrooms; }
  get bathrooms(): number { return this.#props.bathrooms; }
  get parkingSpaces(): number { return this.#props.parkingSpaces; }
  get amenities(): readonly string[] { return this.#props.amenities; }
  get listing(): Listing { return this.#props.listing; }
  get createdAt(): Date { return this.#props.createdAt; }
  get updatedAt(): Date { return this.#props.updatedAt; }

  private static validateCount(value: number, field: string, zero = false): void {
    if (!Number.isInteger(value) || value < (zero ? 0 : 1)) throw new InvalidPropertyFieldError(field, `Quantidade de ${field} inválida.`);
  }
}
