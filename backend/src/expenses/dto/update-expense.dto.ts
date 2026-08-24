import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  expenseDate?: string;

  @IsOptional()
  @IsEnum(['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'OTHER'])
  paymentMethod?: 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'TRANSFER' | 'OTHER';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
