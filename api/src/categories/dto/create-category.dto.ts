import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1, { message: 'Nama kategori wajib diisi' })
  @MaxLength(60)
  name!: string;
}
