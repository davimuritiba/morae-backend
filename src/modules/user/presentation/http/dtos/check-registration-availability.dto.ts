import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CheckRegistrationAvailabilityDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cpf?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  enrollmentNumber?: string | null;
}
