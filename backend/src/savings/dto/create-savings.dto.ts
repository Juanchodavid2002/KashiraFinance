import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSavingsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  targetAmount!: number;

  @IsOptional()
  @IsDateString({ strict: true })
  deadline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
