import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
}
