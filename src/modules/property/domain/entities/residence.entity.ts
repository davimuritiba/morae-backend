import { randomUUID } from 'node:crypto';
import { InvalidPropertyFieldError } from '../errors/invalid-property-field.error.js';

export interface ResidenceProps {
  postalCode: string;
  state: string;
  street: string;
  number: string;
  complement: string | null;
  city: string;
  neighborhood: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateResidenceProps {
  postalCode: string;
  state: string;
  street: string;
  number: string;
  complement?: string | null;
  city: string;
  neighborhood: string;
}

export class Residence {
  readonly #id: string;
  readonly #props: ResidenceProps;

  private constructor(id: string, props: ResidenceProps) {
    this.#id = id;
    this.#props = props;
  }

  static create(input: CreateResidenceProps): Residence {
    const now = new Date();
    return new Residence(randomUUID(), {
      postalCode: Residence.text(input.postalCode, 'postalCode', 8, 8, true),
      state: Residence.text(input.state, 'state', 2, 2).toUpperCase(),
      street: Residence.text(input.street, 'street', 1, 150),
      number: Residence.text(input.number, 'number', 1, 20),
      complement: Residence.optionalText(input.complement, 'complement', 100),
      city: Residence.text(input.city, 'city', 1, 100),
      neighborhood: Residence.text(input.neighborhood, 'neighborhood', 1, 100),
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(id: string, props: ResidenceProps): Residence {
    return new Residence(id, { ...props });
  }

  get id(): string { return this.#id; }
  get postalCode(): string { return this.#props.postalCode; }
  get state(): string { return this.#props.state; }
  get street(): string { return this.#props.street; }
  get number(): string { return this.#props.number; }
  get complement(): string | null { return this.#props.complement; }
  get city(): string { return this.#props.city; }
  get neighborhood(): string { return this.#props.neighborhood; }
  get createdAt(): Date { return this.#props.createdAt; }
  get updatedAt(): Date { return this.#props.updatedAt; }

  private static text(raw: string, field: string, min: number, max: number, digits = false): string {
    const value = raw.trim();
    if (value.length < min || value.length > max || (digits && !/^\d+$/.test(value))) {
      throw new InvalidPropertyFieldError(field, `Campo ${field} inválido.`);
    }
    return value;
  }

  private static optionalText(raw: string | null | undefined, field: string, max: number): string | null {
    if (raw === null || raw === undefined || raw.trim() === '') return null;
    return Residence.text(raw, field, 1, max);
  }
}
