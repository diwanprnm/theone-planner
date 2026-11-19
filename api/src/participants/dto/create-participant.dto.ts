import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateParticipantDto {
  @IsString()
  @MinLength(1, { message: 'Nama peserta wajib diisi' })
  @MaxLength(80)
  name!: string;
}
