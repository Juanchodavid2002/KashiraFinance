import { IsEnum } from 'class-validator';
import { Currency } from '@prisma/client';

export class UpdateSettingsDto {
  @IsEnum(Currency)
  currency!: Currency;
}
