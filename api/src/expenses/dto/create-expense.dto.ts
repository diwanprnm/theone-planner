import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ExpenseShareInput {
  @IsUUID()
  participantId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;
}

export class CreateExpenseDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'Nominal pengeluaran harus lebih dari nol' })
  amount!: number;

  @IsString()
  @MinLength(1, { message: 'Keterangan wajib diisi' })
  @MaxLength(200)
  description!: string;

  @IsDateString({}, { message: 'Tanggal pengeluaran tidak valid' })
  date!: string;

  @IsEnum(PaymentMethod, { message: 'Metode pembayaran tidak dikenal' })
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsUUID()
  budgetItemId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  /** Pembayar — Peserta yang menalangi lebih dulu. */
  @IsOptional()
  @IsUUID()
  payerId?: string;

  /** Path objek foto struk di Supabase Storage, bila ada. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptPath?: string;

  /**
   * Bagian per Peserta. Bila dikosongkan, biaya dibagi rata ke seluruh
   * Peserta Acara. Bila diisi, jumlahnya harus sama dengan `amount`.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseShareInput)
  shares?: ExpenseShareInput[];
}
