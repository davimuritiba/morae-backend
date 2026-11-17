import { IsString, MaxLength } from 'class-validator';

// Valida só a forma da requisição. O formato do e-mail é conferido pelo VO
// Email no caso de uso; a senha não tem regra aqui, porque qualquer senha
// errada resulta no mesmo InvalidCredentialsError. Os MaxLength são só um teto
// contra payloads abusivos.
//
// Sem decorators, o ValidationPipe global (whitelist + forbidNonWhitelisted)
// recusaria todos os campos com 400.
export class LoginDto {
  @IsString()
  @MaxLength(320)
  email: string;

  @IsString()
  @MaxLength(256)
  password: string;
}
