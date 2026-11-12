import { IsString, MaxLength } from 'class-validator';

export class ConfirmEmailVerificationDto {
  // O token gerado tem 43 caracteres; o teto só barra payloads abusivos.
  @IsString()
  @MaxLength(128)
  token: string;
}
