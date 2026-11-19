import {
  MinLength,
  MaxLength,
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';
import { Currency } from '@prisma/client';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: 'El usuario solo admite letras, números, "_" y "."',
  })
  username?: string;

  @IsEmail()
  @MaxLength(120)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}
