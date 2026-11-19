import { IsArray, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUID } from 'class-validator';

class ParticipantItem {
  @IsUUID()
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

/** Menyimpan daftar peserta sekaligus — dipakai layar "Kelola Peserta". */
export class ReplaceParticipantsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantItem)
  participants!: ParticipantItem[];
}
