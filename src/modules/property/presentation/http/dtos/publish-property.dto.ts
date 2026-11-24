import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ContractType } from '../../../domain/enums/contract-type.enum.js';
import { HousingType } from '../../../domain/enums/housing-type.enum.js';
import { MinimumStay } from '../../../domain/enums/minimum-stay.enum.js';

function parseAmenities(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export class PublishPropertyDto {
  @IsString()
  postalCode: string;

  @IsString()
  @MaxLength(2)
  state: string;

  @IsString()
  @MaxLength(150)
  street: string;

  @IsString()
  @MaxLength(20)
  number: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(100)
  neighborhood: string;

  @IsEnum(HousingType)
  housingType: HousingType;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32767)
  bedrooms: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32767)
  bathrooms: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(32767)
  parkingSpaces: number;

  @Transform(({ value }) => parseAmenities(value))
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  amenities: string[];

  @IsString()
  @MaxLength(90)
  title: string;

  @IsString()
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rules?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  rent: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  condominium?: number;

  @IsEnum(ContractType)
  contractType: ContractType;

  @IsEnum(MinimumStay)
  minimumStay: MinimumStay;
}
