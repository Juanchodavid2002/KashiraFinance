import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';

export class VerifyResetCodeDto {
  @IsEmail()
  @MaxLength(120)
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  code!: string;
}
