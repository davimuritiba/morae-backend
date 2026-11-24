import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CampusDistance,
  DesiredRoommates,
  Gender,
  PreferredHousingType,
  RoommateGender,
} from '../../../domain/enums/profile-details.enum.js';

// Todos opcionais: ausente mantém o valor atual; null ou "" apaga.
// Limites e regras finas (idade, CEP, orçamento) ficam na entidade UserProfileDetails.
export class ProfileDetailsDto {
  @IsOptional() @IsString() @MaxLength(1000) bio?: string | null;
  @IsOptional() @IsISO8601({ strict: true }) birthDate?: string | null;
  @IsOptional() @IsEnum(Gender) gender?: Gender | null;
  @IsOptional() @IsString() @MaxLength(60) country?: string | null;
  @IsOptional() @IsString() @MaxLength(60) state?: string | null;
  @IsOptional() @IsString() @MaxLength(100) city?: string | null;
  @IsOptional() @IsString() @MaxLength(100) neighborhood?: string | null;
  @IsOptional() @IsString() @MaxLength(9) postalCode?: string | null;
  @IsOptional() @IsString() @MaxLength(200) address?: string | null;
  @IsOptional() @IsString() @MaxLength(150) university?: string | null;
  @IsOptional() @IsString() @MaxLength(100) campus?: string | null;
  @IsOptional() @IsEnum(PreferredHousingType) housingType?: PreferredHousingType | null;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) maxBudget?: number | null;
  @IsOptional() @IsEnum(CampusDistance) campusDistance?: CampusDistance | null;
  @IsOptional() @IsString() @MaxLength(300) preferredNeighborhoods?: string | null;
  @IsOptional() @IsEnum(DesiredRoommates) desiredRoommates?: DesiredRoommates | null;
  @IsOptional() @IsEnum(RoommateGender) roommateGender?: RoommateGender | null;
}

// Copia só os campos enviados (o class-transformer pode criar chaves undefined).
export function profileDetailsInput(dto: ProfileDetailsDto | undefined) {
  if (!dto) return undefined;
  return Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
}
