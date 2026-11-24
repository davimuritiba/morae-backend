import {
  CampusDistance,
  DesiredRoommates,
  Gender,
  PreferredHousingType,
  RoommateGender,
} from '../enums/profile-details.enum.js';
import { InvalidProfileDetailsError } from '../errors/invalid-profile-details.error.js';

export interface UserProfileDetailsData {
  bio: string | null;
  birthDate: Date | null;
  gender: Gender | null;
  country: string | null;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  postalCode: string | null;
  address: string | null;
  university: string | null;
  campus: string | null;
  housingType: PreferredHousingType | null;
  maxBudget: number | null;
  campusDistance: CampusDistance | null;
  preferredNeighborhoods: string | null;
  desiredRoommates: DesiredRoommates | null;
  roommateGender: RoommateGender | null;
}

// Entrada crua: campo ausente (undefined) mantém o valor atual; null ou texto
// vazio apaga o valor.
export type UserProfileDetailsInput = {
  [K in keyof UserProfileDetailsData]?: unknown;
};

export const PROFILE_DETAILS_FIELDS = [
  'bio',
  'birthDate',
  'gender',
  'country',
  'state',
  'city',
  'neighborhood',
  'postalCode',
  'address',
  'university',
  'campus',
  'housingType',
  'maxBudget',
  'campusDistance',
  'preferredNeighborhoods',
  'desiredRoommates',
  'roommateGender',
] as const satisfies readonly (keyof UserProfileDetailsData)[];

const TEXT_LIMITS = {
  bio: 1000,
  country: 60,
  state: 60,
  city: 100,
  neighborhood: 100,
  address: 200,
  university: 150,
  campus: 100,
  preferredNeighborhoods: 300,
} as const;

const ENUMS = {
  gender: Gender,
  housingType: PreferredHousingType,
  campusDistance: CampusDistance,
  desiredRoommates: DesiredRoommates,
  roommateGender: RoommateGender,
} as const;

const FIELD_LABELS: Record<keyof UserProfileDetailsData, string> = {
  bio: 'A apresentação',
  birthDate: 'A data de nascimento',
  gender: 'O gênero',
  country: 'O país',
  state: 'O estado',
  city: 'A cidade',
  neighborhood: 'O bairro',
  postalCode: 'O CEP',
  address: 'O endereço',
  university: 'A universidade',
  campus: 'O campus',
  housingType: 'O tipo de moradia',
  maxBudget: 'O orçamento máximo',
  campusDistance: 'A distância do campus',
  preferredNeighborhoods: 'Os bairros de interesse',
  desiredRoommates: 'O número de moradores',
  roommateGender: 'A preferência de gênero dos moradores',
};

const MIN_AGE = 14;
const MAX_AGE = 100;
const MAX_BUDGET = 100_000;

const EMPTY: UserProfileDetailsData = Object.fromEntries(
  PROFILE_DETAILS_FIELDS.map((field) => [field, null]),
) as unknown as UserProfileDetailsData;

// Dados pessoais e preferências de moradia de um usuário (1:1 com User).
// Imutável: withChanges devolve uma nova instância já validada.
export class UserProfileDetails {
  readonly #userId: string;
  readonly #data: UserProfileDetailsData;
  readonly #updatedAt: Date;

  private constructor(userId: string, data: UserProfileDetailsData, updatedAt: Date) {
    this.#userId = userId;
    this.#data = Object.freeze({ ...data });
    this.#updatedAt = updatedAt;
  }

  static create(userId: string, input: UserProfileDetailsInput, now = new Date()): UserProfileDetails {
    return new UserProfileDetails(userId, UserProfileDetails.merge(EMPTY, input, now), now);
  }

  static restore(userId: string, data: UserProfileDetailsData, updatedAt: Date): UserProfileDetails {
    return new UserProfileDetails(userId, data, updatedAt);
  }

  get userId(): string {
    return this.#userId;
  }

  get data(): UserProfileDetailsData {
    return { ...this.#data };
  }

  get updatedAt(): Date {
    return this.#updatedAt;
  }

  get isEmpty(): boolean {
    return PROFILE_DETAILS_FIELDS.every((field) => this.#data[field] === null);
  }

  withChanges(input: UserProfileDetailsInput, now = new Date()): UserProfileDetails {
    return new UserProfileDetails(this.#userId, UserProfileDetails.merge(this.#data, input, now), now);
  }

  // Idade em anos completos na data informada; null sem data de nascimento.
  ageAt(date: Date): number | null {
    const birth = this.#data.birthDate;
    if (!birth) return null;
    return ageBetween(birth, date);
  }

  private static merge(
    current: UserProfileDetailsData,
    input: UserProfileDetailsInput,
    now: Date,
  ): UserProfileDetailsData {
    const next = { ...current } as Record<keyof UserProfileDetailsData, unknown>;
    for (const field of PROFILE_DETAILS_FIELDS) {
      if (input[field] === undefined) continue;
      next[field] = UserProfileDetails.parse(field, input[field], now);
    }
    return next as UserProfileDetailsData;
  }

  private static parse(field: keyof UserProfileDetailsData, raw: unknown, now: Date): unknown {
    if (raw === null || (typeof raw === 'string' && raw.trim() === '')) return null;
    const invalid = (reason: string) =>
      new InvalidProfileDetailsError(`${FIELD_LABELS[field]} ${reason}`);

    if (field in TEXT_LIMITS) {
      if (typeof raw !== 'string') throw invalid('deve ser um texto.');
      // A apresentação mantém as quebras de linha; os demais campos são de uma linha só.
      const value = field === 'bio' ? raw.trim() : raw.trim().replace(/\s+/g, ' ');
      const limit = TEXT_LIMITS[field as keyof typeof TEXT_LIMITS];
      if (value.length > limit) throw invalid(`deve ter no máximo ${limit} caracteres.`);
      return value;
    }

    if (field in ENUMS) {
      const values = Object.values(ENUMS[field as keyof typeof ENUMS]) as string[];
      if (typeof raw !== 'string' || !values.includes(raw)) throw invalid('não é uma opção válida.');
      return raw;
    }

    if (field === 'postalCode') {
      const digits = typeof raw === 'string' ? raw.replace(/\D/g, '') : '';
      if (digits.length !== 8) throw invalid('deve ter 8 dígitos.');
      return digits;
    }

    if (field === 'maxBudget') {
      const value = typeof raw === 'string' ? Number(raw.replace(',', '.')) : raw;
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > MAX_BUDGET) {
        throw invalid(`deve ser um valor entre R$ 1 e R$ ${MAX_BUDGET.toLocaleString('pt-BR')}.`);
      }
      return Math.round(value * 100) / 100;
    }

    // birthDate
    const date = raw instanceof Date ? raw : typeof raw === 'string' ? new Date(`${raw.slice(0, 10)}T00:00:00Z`) : null;
    if (!date || Number.isNaN(date.getTime())) throw invalid('é inválida.');
    const age = ageBetween(date, now);
    if (age < MIN_AGE || age > MAX_AGE) {
      throw invalid(`deve indicar idade entre ${MIN_AGE} e ${MAX_AGE} anos.`);
    }
    return date;
  }
}

function ageBetween(birth: Date, date: Date): number {
  let age = date.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday =
    date.getUTCMonth() < birth.getUTCMonth() ||
    (date.getUTCMonth() === birth.getUTCMonth() && date.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
