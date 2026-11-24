import { ProfileDetailsDto } from './profile-details.dto.js';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsObject,
  IsString,
  MaxLength,
  ArrayMinSize,
  ArrayUnique,
  ValidateNested,
} from 'class-validator';

import {
  CleaningFrequency,
  EnvironmentPreference,
  LifestyleTrait,
  OrganizationLevel,
  PetPreference,
  SleepTime,
  SmokingFrequency,
  StudyAtHome,
  VisitorFrequency,
} from '../../../domain/enums/student-compatibility.enum.js';

export class StudentCompatibilityAnswersDto {
  @IsEnum(SleepTime) sleepTime: SleepTime;
  @IsEnum(StudyAtHome) studyAtHome: StudyAtHome;
  @IsEnum(OrganizationLevel) organization: OrganizationLevel;
  @IsEnum(VisitorFrequency) visitors: VisitorFrequency;
  @IsEnum(SmokingFrequency) smoking: SmokingFrequency;
  @IsEnum(PetPreference) pets: PetPreference;
  @IsEnum(CleaningFrequency) cleaning: CleaningFrequency;
  @IsEnum(EnvironmentPreference) environment: EnvironmentPreference;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(LifestyleTrait, { each: true })
  lifestyle: LifestyleTrait[];
}

export class RegisterStudentDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  @MaxLength(320)
  email: string;

  @IsString()
  @MaxLength(20)
  cpf: string;

  @IsString()
  @MaxLength(256)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsString()
  @MaxLength(30)
  enrollmentNumber: string;

  @IsString()
  @MaxLength(200)
  course: string;

  @IsInt()
  period: number;

  // Data no formato ISO 8601, ex.: "2027-12-15". strict recusa datas que não
  // existem, como "2027-02-30".
  @IsISO8601({ strict: true })
  expectedGraduation: string;

  // @ValidateNested ignora campo ausente: sem o @IsDefined, um cadastro sem as
  // respostas passava pela validação e quebrava o caso de uso com 500.
  @IsDefined()
  @ValidateNested()
  @Type(() => StudentCompatibilityAnswersDto)
  compatibilityAnswers: StudentCompatibilityAnswersDto;

  // Quando verdadeiro, a conta recebe também o perfil necessário para anunciar vagas.
  @IsOptional()
  @IsBoolean()
  advertisesProperty?: boolean;

  @IsOptional()
  @IsObject()
  profileData?: Record<string, unknown>;
  @ValidateNested()
  @Type(() => ProfileDetailsDto)
  profileDetails?: ProfileDetailsDto;
}
