import type { ContractType } from '../../../domain/enums/contract-type.enum.js';
import type { HousingType } from '../../../domain/enums/housing-type.enum.js';
import type { MediaType } from '../../../domain/enums/media-type.enum.js';
import type { MinimumStay } from '../../../domain/enums/minimum-stay.enum.js';

export interface PublishPropertyInput {
  cohabitantIds: string[];
  postalCode: string;
  state: string;
  street: string;
  number: string;
  complement?: string | null;
  city: string;
  neighborhood: string;
  housingType: HousingType;
  bedrooms: number;
  bathrooms: number;
  parkingSpaces?: number;
  amenities?: string[];
  title: string;
  description: string;
  rules?: string | null;
  rent: number;
  condominium?: number | null;
  contractType: ContractType;
  minimumStay: MinimumStay;
  media?: { type: MediaType; url: string; position: number }[];
}
