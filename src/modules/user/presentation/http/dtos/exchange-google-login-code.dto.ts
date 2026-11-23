import { IsString, MaxLength, MinLength } from 'class-validator';

export class ExchangeGoogleLoginCodeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  code!: string;
}
