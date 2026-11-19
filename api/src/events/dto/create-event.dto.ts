import { EventStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MinLength(1, { message: 'Nama acara wajib diisi' })
  @MaxLength(120)
  name!: string;

  @IsDateString({}, { message: 'Tanggal mulai tidak valid' })
  startDate!: string;

  @IsDateString({}, { message: 'Tanggal selesai tidak valid' })
  endDate!: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  /** Uang Terkumpul — satu angka per Acara. Boleh dikosongkan. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  fundsRaised?: number;
}
