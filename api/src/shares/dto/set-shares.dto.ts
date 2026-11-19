import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ShareInput {
  @IsUUID()
  participantId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;
}

/** Mengganti seluruh pembagian satu Pengeluaran. */
export class SetSharesDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Pembagian tidak boleh kosong' })
  @ValidateNested({ each: true })
  @Type(() => ShareInput)
  shares!: ShareInput[];
}
