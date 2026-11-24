import { Transform } from 'class-transformer';
import { IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SubmitReviewDto {
  @IsUUID()
  contractId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  cleanliness!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  condition!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  location!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  communication!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  value!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  overall!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(20)
  @MaxLength(1000)
  comment!: string;
}
