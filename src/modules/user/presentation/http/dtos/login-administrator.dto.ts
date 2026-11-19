import { IsString, MaxLength } from 'class-validator';

export class LoginAdministratorDto {
  @IsString()
  @MaxLength(100)
  login: string;

  @IsString()
  @MaxLength(256)
  password: string;
}
