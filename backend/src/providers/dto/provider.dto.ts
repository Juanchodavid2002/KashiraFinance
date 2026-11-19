import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateProviderDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
