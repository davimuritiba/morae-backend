import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProfileDetailsDto } from './profile-details.dto.js';
import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class RegisterPropertyOwnerDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MaxLength(20)
  cpf!: string;

  @IsString()
  @MaxLength(256)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsObject()
  profileData?: Record<string, unknown>;
  @ValidateNested()
  @Type(() => ProfileDetailsDto)
  profileDetails?: ProfileDetailsDto;
}
