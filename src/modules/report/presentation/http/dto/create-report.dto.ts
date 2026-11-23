import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ReportCategory } from '../../../domain/enums/report-category.enum.js';

export class CreateReportDto {
  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @IsOptional()
  @IsUUID()
  listingId?: string;

  @IsEnum(ReportCategory)
  category!: ReportCategory;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  description!: string;
}
