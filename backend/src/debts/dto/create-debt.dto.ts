import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { DebtKind } from '@prisma/client';

export class CreateDebtDto {
  @IsEnum(DebtKind)
  kind!: DebtKind;

  @IsOptional()
  @IsString()
  interestType?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lender?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  totalAmount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalInstallments?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  paidInstallments?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  installmentAmount?: number;

  @IsOptional()
  @IsDateString({ strict: true })
  startDate?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  dueDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
