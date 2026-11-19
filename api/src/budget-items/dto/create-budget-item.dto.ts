import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

export class CreateBudgetItemDto {
  @IsString()
  @MinLength(1, { message: 'Nama item wajib diisi' })
  @MaxLength(120)
  name!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
