import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ReportSummary {
  eventId: string;
  budgetTotal: Prisma.Decimal;
  realizedTotal: Prisma.Decimal;
  remaining: Prisma.Decimal;
  fundsRaised: Prisma.Decimal | null;
  /** Uang Terkumpul − Realisasi. Positif berarti surplus. */
  surplus: Prisma.Decimal | null;
  perActivity: {
    activityId: string;
    name: string;
    budgetTotal: Prisma.Decimal;
    realizedTotal: Prisma.Decimal;
    delta: Prisma.Decimal;
  }[];
}

export interface CategoryBreakdownRow {
  categoryId: string | null;
  categoryName: string;
  total: Prisma.Decimal;
  expenseCount: number;
}

export interface TalanganRow {
  participantId: string;
  participantName: string;
  total: Prisma.Decimal;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async summary(userId: string, eventId: string): Promise<ReportSummary> {
    await this.events.assertOwned(userId, eventId);

    const event = await this.prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      select: {
        fundsRaised: true,
        activities: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            budgetItems: { select: { amount: true } },
            expenses: { select: { amount: true } },
          },
        },
      },
    });

    const perActivity = event.activities.map((activity) => {
      const budgetTotal = activity.budgetItems.reduce(
        (sum, item) => sum.plus(item.amount),
        new Prisma.Decimal(0),
      );
      const realizedTotal = activity.expenses.reduce(
        (sum, expense) => sum.plus(expense.amount),
        new Prisma.Decimal(0),
      );

      return {
        activityId: activity.id,
        name: activity.name,
        budgetTotal,
        realizedTotal,
        delta: budgetTotal.minus(realizedTotal),
      };
    });

    const budgetTotal = perActivity.reduce(
      (sum, row) => sum.plus(row.budgetTotal),
      new Prisma.Decimal(0),
    );
    const realizedTotal = perActivity.reduce(
      (sum, row) => sum.plus(row.realizedTotal),
      new Prisma.Decimal(0),
    );

    return {
      eventId,
      budgetTotal,
      realizedTotal,
      remaining: budgetTotal.minus(realizedTotal),
      fundsRaised: event.fundsRaised,
      surplus: event.fundsRaised?.minus(realizedTotal) ?? null,
      perActivity,
    };
  }

  /** Pengeluaran dikelompokkan per Kategori. */
  async byCategory(userId: string, eventId: string): Promise<CategoryBreakdownRow[]> {
    await this.events.assertOwned(userId, eventId);

    const grouped = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: { activity: { eventId } },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const categoryIds = grouped
      .map((row) => row.categoryId)
      .filter((id): id is string => id !== null);

    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const names = new Map(categories.map((category) => [category.id, category.name]));

    return grouped
      .map((row) => ({
        categoryId: row.categoryId,
        categoryName: row.categoryId
          ? (names.get(row.categoryId) ?? 'Tanpa nama')
          : 'Tanpa kategori',
        total: row._sum.amount ?? new Prisma.Decimal(0),
        expenseCount: row._count._all,
      }))
      .sort((a, b) => b.total.comparedTo(a.total));
  }

  /**
   * Rekap Talangan — berapa tiap orang menalangi lebih dulu.
   *
   * Sengaja HANYA menampilkan sisi "menalangi". Aplikasi tidak menghitung
   * utang bersih antar orang (lihat CONTEXT.md → Talangan dan daftar larangan).
   */
  async talangan(userId: string, eventId: string): Promise<TalanganRow[]> {
    await this.events.assertOwned(userId, eventId);

    const grouped = await this.prisma.expense.groupBy({
      by: ['payerId'],
      where: { activity: { eventId }, payerId: { not: null } },
      _sum: { amount: true },
    });

    const payerIds = grouped
      .map((row) => row.payerId)
      .filter((id): id is string => id !== null);

    const participants = await this.prisma.participant.findMany({
      where: { id: { in: payerIds } },
      select: { id: true, name: true },
    });
    const names = new Map(participants.map((participant) => [participant.id, participant.name]));

    return grouped
      .filter((row) => row.payerId !== null)
      .map((row) => ({
        participantId: row.payerId as string,
        participantName: names.get(row.payerId as string) ?? 'Tanpa nama',
        total: row._sum.amount ?? new Prisma.Decimal(0),
      }))
      .sort((a, b) => b.total.comparedTo(a.total));
  }
}
