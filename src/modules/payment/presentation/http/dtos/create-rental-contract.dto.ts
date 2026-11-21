import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateRentalContractDto {
  @IsUUID()
  listingId!: string;

  @IsEmail()
  tenantEmail!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startsAt!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endsAt?: string;

  @IsInt()
  @Min(1)
  @Max(28)
  dueDay!: number;
}
