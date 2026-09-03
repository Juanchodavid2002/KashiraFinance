import {
  MinLength,
  MaxLength,
  IsEmail,
  IsString,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Currency } from '@prisma/client';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

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
