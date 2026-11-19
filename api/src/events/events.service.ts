import { Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { UpdateEventDto } from './dto/update-event.dto';

/**
 * Ringkasan angka sebuah Acara. Anggaran dan realisasi selalu DIHITUNG dari
 * Item Anggaran dan Pengeluaran di bawahnya — tidak pernah disimpan terpisah
 * (lihat CONTEXT.md → Anggaran).
 */
export interface EventSummary {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: EventStatus;
  fundsRaised: Prisma.Decimal | null;
  budgetTotal: Prisma.Decimal;
  realizedTotal: Prisma.Decimal;
  remaining: Prisma.Decimal;
  participantCount: number;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async create(userId: string, dto: CreateEventDto): Promise<EventSummary> {
    const event = await this.prisma.event.create({
      data: {
        userId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        status: dto.status ?? EventStatus.DRAFT,
        fundsRaised: dto.fundsRaised ?? null,
      },
      select: { id: true },
    });

    return this.findOne(userId, event.id);
  }

  async findAll(userId: string, query: QueryEventsDto): Promise<EventSummary[]> {
    // Satu kueri untuk seluruh Acara beserta item anggaran, pengeluaran, dan
    // jumlah pesertanya — bukan satu kueri per Acara (findOne) seperti
    // sebelumnya, yang menjadi N+1 saat daftar acara panjang.
    const events = await this.prisma.event.findMany({
      where: {
        userId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? { name: { contains: query.search, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
        fundsRaised: true,
        activities: {
          select: {
            budgetItems: { select: { amount: true } },
            expenses: { select: { amount: true } },
          },
        },
        _count: { select: { participants: true } },
      },
    });

    return events.map((event) => this.toSummary(event));
  }

  async findOne(userId: string, id: string): Promise<EventSummary> {
    const event = await this.prisma.event.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        status: true,
        fundsRaised: true,
        activities: {
          select: {
            budgetItems: { select: { amount: true } },
            expenses: { select: { amount: true } },
          },
        },
        _count: { select: { participants: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Acara tidak ditemukan');
    }

    return this.toSummary(event);
  }

  /** Menghitung anggaran & realisasi dari baris yang sudah diambil. */
  private toSummary(event: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    status: EventStatus;
    fundsRaised: Prisma.Decimal | null;
    activities: {
      budgetItems: { amount: Prisma.Decimal }[];
      expenses: { amount: Prisma.Decimal }[];
    }[];
    _count: { participants: number };
  }): EventSummary {
    const budgetTotal = event.activities
      .flatMap((activity) => activity.budgetItems)
      .reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0));

    const realizedTotal = event.activities
      .flatMap((activity) => activity.expenses)
      .reduce((sum, expense) => sum.plus(expense.amount), new Prisma.Decimal(0));

    return {
      id: event.id,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
      fundsRaised: event.fundsRaised,
      budgetTotal,
      realizedTotal,
      remaining: budgetTotal.minus(realizedTotal),
      participantCount: event._count.participants,
    };
  }

  async update(userId: string, id: string, dto: UpdateEventDto): Promise<EventSummary> {
    await this.assertOwned(userId, id);

    await this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.fundsRaised !== undefined ? { fundsRaised: dto.fundsRaised } : {}),
      },
    });

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertOwned(userId, id);

    // Kumpulkan path struk SEBELUM menghapus — setelah baris Pengeluaran
    // terhapus, path-nya ikut hilang dan objek di Storage menjadi yatim.
    const receipts = await this.prisma.expense.findMany({
      where: { activity: { eventId: id }, receiptPath: { not: null } },
      select: { receiptPath: true },
    });

    // Kegiatan, Item Anggaran, Pengeluaran, Peserta, dan Bagian ikut terhapus
    // lewat onDelete: Cascade pada skema.
    await this.prisma.event.delete({ where: { id } });

    await Promise.all(
      receipts
        .map((row) => row.receiptPath)
        .filter((path): path is string => Boolean(path))
        .map((path) => this.supabase.removeReceipt(path)),
    );
  }

  /** Memastikan Acara ada DAN milik Pengguna ini. Dipakai modul lain juga. */
  async assertOwned(userId: string, id: string): Promise<void> {
    const count = await this.prisma.event.count({ where: { id, userId } });

    if (count === 0) {
      throw new NotFoundException('Acara tidak ditemukan');
    }
  }
}
