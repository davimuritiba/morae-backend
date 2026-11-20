import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { HousingType } from '../../../domain/enums/housing-type.enum.js';
import { ListingSortBy } from '../../../domain/repositories/listing.repository.js';

export class SearchListingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  maxRent?: number;

  @IsOptional()
  @IsEnum(HousingType)
  housingType?: HousingType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  minBedrooms?: number;

  @IsOptional()
  @IsEnum(ListingSortBy)
  sortBy?: ListingSortBy;
}
