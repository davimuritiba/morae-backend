import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ProfileDetailsDto } from './profile-details.dto.js';
import { StudentCompatibilityAnswersDto } from './register-student.dto.js';

export class UpdateMyProfileDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileDetailsDto)
  details?: ProfileDetailsDto;

  @IsOptional() @IsString() @MaxLength(100) course?: string;
  @IsOptional() @IsInt() period?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => StudentCompatibilityAnswersDto)
  compatibilityAnswers?: StudentCompatibilityAnswersDto;
}
