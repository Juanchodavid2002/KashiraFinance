import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color debe ser un hex #RRGGBB' })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  icon?: string;
}
