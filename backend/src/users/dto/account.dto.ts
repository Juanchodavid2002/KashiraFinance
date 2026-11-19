import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: 'El usuario solo admite letras, números, "_" y "."',
  })
  username?: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}
