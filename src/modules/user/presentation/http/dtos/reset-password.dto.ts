import { IsString, MaxLength, MinLength } from 'class-validator';
import { Password } from '../../../domain/value-objects/password.vo.js';

export class ResetPasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  token: string;

  @IsString()
  @MinLength(Password.MIN_LENGTH)
  @MaxLength(Password.MAX_LENGTH)
  password: string;

  @IsString()
  @MinLength(Password.MIN_LENGTH)
  @MaxLength(Password.MAX_LENGTH)
  passwordConfirmation: string;
}
