import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { BudgetLineType } from '@prisma/client';

export class CreateBudgetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateBudgetDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateBudgetLineDto {
  @IsEnum(BudgetLineType)
  type!: BudgetLineType;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  amount?: number;

  @IsOptional()
  @IsBoolean()
  included?: boolean;
}

export class UpdateBudgetLineDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  amount?: number;

  @IsOptional()
  @IsBoolean()
  included?: boolean;
}
