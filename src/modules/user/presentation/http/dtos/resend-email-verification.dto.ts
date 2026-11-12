import { IsString, MaxLength } from 'class-validator';

export class ResendEmailVerificationDto {
  @IsString()
  @MaxLength(320)
  email: string;
}
