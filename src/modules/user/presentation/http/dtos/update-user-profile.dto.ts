import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

// Validação estrutural HTTP. Formatos de e-mail, CPF e telefone são validados
// pelos value objects no caso de uso.
export class UpdateUserProfileDto {
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(100)
  name?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(320)
  email?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(20)
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;
}
