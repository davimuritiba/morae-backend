import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchListingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;
}
