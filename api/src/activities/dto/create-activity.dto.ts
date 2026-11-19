import { IsDateString, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  @MinLength(1, { message: 'Nama kegiatan wajib diisi' })
  @MaxLength(120)
  name!: string;

  @IsDateString({}, { message: 'Tanggal kegiatan tidak valid' })
  date!: string;

  /** Jam format "HH:mm", mis. "08:00". */
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Jam harus berformat HH:mm' })
  time?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
