import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

export interface ActivitySummary {
  id: string;
  eventId: string;
  name: string;
  sortOrder: number;
  date: Date;
  time: string | null;
  location: string | null;
  notes: string | null;
  budgetTotal: Prisma.Decimal;
  realizedTotal: Prisma.Decimal;
  remaining: Prisma.Decimal;
}

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
    private readonly supabase: SupabaseService,
  ) {}

  async create(userId: string, eventId: string, dto: CreateActivityDto): Promise<ActivitySummary> {
    await this.events.assertOwned(userId, eventId);

    const sortOrder = dto.sortOrder ?? (await this.nextSortOrder(eventId));

    const activity = await this.prisma.activity.create({
      data: {
        eventId,
        name: dto.name,
        date: new Date(dto.date),
        time: dto.time ?? null,
        location: dto.location ?? null,
        notes: dto.notes ?? null,
        sortOrder,
      },
      select: { id: true },
    });

    return this.findOne(userId, activity.id);
  }

  async findAll(userId: string, eventId: string): Promise<ActivitySummary[]> {
    await this.events.assertOwned(userId, eventId);

    // Satu kueri untuk seluruh Kegiatan beserta item anggaran & pengeluarannya,
    // lalu dijumlahkan di memori — jauh lebih murah daripada satu kueri per
    // Kegiatan (findOne) seperti sebelumnya.
    const activities = await this.prisma.activity.findMany({
      where: { eventId },
      orderBy: [{ sortOrder: 'asc' }, { date: 'asc' }],
      select: {
        id: true,
        eventId: true,
        name: true,
        sortOrder: true,
        date: true,
        time: true,
        location: true,
        notes: true,
        budgetItems: { select: { amount: true } },
        expenses: { select: { amount: true } },
      },
    });

    return activities.map((activity) => this.toSummary(activity));
  }

  async findOne(userId: string, id: string): Promise<ActivitySummary> {
    const activity = await this.prisma.activity.findFirst({
      where: { id, event: { userId } },
      select: {
        id: true,
        eventId: true,
        name: true,
        sortOrder: true,
        date: true,
        time: true,
        location: true,
        notes: true,
        budgetItems: { select: { amount: true } },
        expenses: { select: { amount: true } },
      },
    });

    if (!activity) {
      throw new NotFoundException('Kegiatan tidak ditemukan');
    }

    return this.toSummary(activity);
  }

  /** Menjumlahkan anggaran & realisasi dari baris yang sudah diambil. */
  private toSummary(activity: {
    id: string;
    eventId: string;
    name: string;
    sortOrder: number;
    date: Date;
    time: string | null;
    location: string | null;
    notes: string | null;
    budgetItems: { amount: Prisma.Decimal }[];
    expenses: { amount: Prisma.Decimal }[];
  }): ActivitySummary {
    const budgetTotal = activity.budgetItems.reduce(
      (sum, item) => sum.plus(item.amount),
      new Prisma.Decimal(0),
    );
    const realizedTotal = activity.expenses.reduce(
      (sum, expense) => sum.plus(expense.amount),
      new Prisma.Decimal(0),
    );

    return {
      id: activity.id,
      eventId: activity.eventId,
      name: activity.name,
      sortOrder: activity.sortOrder,
      date: activity.date,
      time: activity.time,
      location: activity.location,
      notes: activity.notes,
      budgetTotal,
      realizedTotal,
      remaining: budgetTotal.minus(realizedTotal),
    };
  }

  async update(userId: string, id: string, dto: UpdateActivityDto): Promise<ActivitySummary> {
    await this.assertOwned(userId, id);

    await this.prisma.activity.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.time !== undefined ? { time: dto.time } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertOwned(userId, id);

    // Kumpulkan path struk SEBELUM menghapus — setelah baris Pengeluaran ikut
    // terhapus lewat cascade, path-nya hilang dan objek di Storage menjadi
    // yatim (lihat pola yang sama di EventsService.remove).
    const receipts = await this.prisma.expense.findMany({
      where: { activityId: id, receiptPath: { not: null } },
      select: { receiptPath: true },
    });

    await this.prisma.activity.delete({ where: { id } });

    await Promise.all(
      receipts
        .map((row) => row.receiptPath)
        .filter((path): path is string => Boolean(path))
        .map((path) => this.supabase.removeReceipt(path)),
    );
  }

  /** Memastikan Kegiatan ada DAN milik Pengguna ini. */
  async assertOwned(userId: string, id: string): Promise<void> {
    const count = await this.prisma.activity.count({
      where: { id, event: { userId } },
    });

    if (count === 0) {
      throw new NotFoundException('Kegiatan tidak ditemukan');
    }
  }

  private async nextSortOrder(eventId: string): Promise<number> {
    const last = await this.prisma.activity.findFirst({
      where: { eventId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return (last?.sortOrder ?? -1) + 1;
  }
}
