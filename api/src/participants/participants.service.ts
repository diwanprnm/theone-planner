import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { ReplaceParticipantsDto } from './dto/replace-participants.dto';

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async create(userId: string, eventId: string, dto: CreateParticipantDto) {
    await this.events.assertOwned(userId, eventId);

    // Nama harus unik tanpa memandang besar-kecil huruf — aturan yang sama
    // dengan yang ditampilkan layar "Kelola Peserta". Kendala @@unique di
    // database peka huruf, jadi "Budi" dan "budi" harus ditolak di sini.
    const existing = await this.prisma.participant.count({
      where: { eventId, name: { equals: dto.name, mode: 'insensitive' } },
    });
    if (existing > 0) {
      throw new ConflictException('Nama peserta itu sudah ada di acara ini');
    }

    try {
      return await this.prisma.participant.create({
        data: { eventId, name: dto.name },
        select: { id: true, eventId: true, name: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Nama peserta itu sudah ada di acara ini');
      }
      throw error;
    }
  }

  async findAll(userId: string, eventId: string) {
    await this.events.assertOwned(userId, eventId);

    return this.prisma.participant.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, eventId: true, name: true },
    });
  }

  /**
   * Mengganti seluruh daftar peserta sebuah Acara dalam satu transaksi.
   * Peserta yang dihapus akan menghapus Bagian miliknya (cascade), dan
   * Pengeluaran yang ia talangi akan kehilangan Pembayar (SetNull).
   */
  async replaceAll(userId: string, eventId: string, dto: ReplaceParticipantsDto) {
    await this.events.assertOwned(userId, eventId);

    // Nama harus unik tanpa memandang besar-kecil huruf (aturan yang sama
    // dengan create). Diperiksa lebih dulu supaya galatnya 409 yang jelas,
    // bukan 500 dari kendala @@unique di tengah transaksi.
    const seen = new Set<string>();
    for (const participant of dto.participants) {
      const key = participant.name.trim().toLowerCase();
      if (seen.has(key)) {
        throw new ConflictException('Ada nama peserta yang sama. Nama harus unik di satu acara');
      }
      seen.add(key);
    }

    const incomingIds = dto.participants.map((participant) => participant.id);

    // Id yang sudah ada hanya boleh dipakai ulang oleh Peserta di Acara INI.
    // Tanpa batasan ini, id milik acara lain bisa "dicuri" lewat upsert dan
    // mengubah namanya.
    const existing = await this.prisma.participant.findMany({
      where: { id: { in: incomingIds } },
      select: { id: true, eventId: true },
    });
    const mine = new Set(
      existing.filter((row) => row.eventId === eventId).map((row) => row.id),
    );
    const foreign = existing.filter((row) => row.eventId !== eventId);
    if (foreign.length > 0) {
      throw new ConflictException('Ada peserta yang bukan milik acara ini');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.participant.deleteMany({
          where: { eventId, id: { notIn: incomingIds } },
        });

        const toUpdate = dto.participants.filter((participant) => mine.has(participant.id));
        const toCreate = dto.participants.filter((participant) => !mine.has(participant.id));

        // Dua langkah: nama sementara dulu, baru nama final. Tanpa ini,
        // menukar dua nama (mis. Budi↔Ani) akan menabrak kendala unik di
        // tengah jalan, padahal hasil akhirnya tidak duplikat.
        for (const participant of toUpdate) {
          await tx.participant.update({
            where: { id: participant.id },
            data: { name: `__tmp__${participant.id}` },
          });
        }
        for (const participant of toUpdate) {
          await tx.participant.update({
            where: { id: participant.id },
            data: { name: participant.name.trim() },
          });
        }

        for (const participant of toCreate) {
          // Baris baru: biarkan database membuat id-nya sendiri. Id sementara
          // dari klien (randomUUID) tidak dipakai supaya id di klien tidak
          // pernah menjadi id asli.
          await tx.participant.create({
            data: { eventId, name: participant.name.trim() },
          });
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Nama peserta itu sudah ada di acara ini');
      }
      throw error;
    }

    return this.findAll(userId, eventId);
  }

  async remove(userId: string, id: string): Promise<void> {
    const count = await this.prisma.participant.count({
      where: { id, event: { userId } },
    });

    if (count === 0) {
      throw new NotFoundException('Peserta tidak ditemukan');
    }

    await this.prisma.participant.delete({ where: { id } });
  }

  /** Memastikan Peserta ada DAN berada di Acara milik Pengguna ini. */
  async assertOwned(userId: string, id: string): Promise<void> {
    const count = await this.prisma.participant.count({
      where: { id, event: { userId } },
    });

    if (count === 0) {
      throw new NotFoundException('Peserta tidak ditemukan');
    }
  }
}
