import { IsString } from 'class-validator';

export class LoginAdministratorDto {
  @IsString()
  login: string;

  @IsString()
  password: string;
}
