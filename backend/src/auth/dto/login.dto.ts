import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class LoginDto {
  /** Usuario o correo. Se acepta `email` como alias por compatibilidad. */
  @ValidateIf((dto: LoginDto) => dto.email === undefined)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  identifier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
