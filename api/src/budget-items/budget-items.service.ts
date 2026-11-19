import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ActivitiesService } from '../activities/activities.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { UpdateBudgetItemDto } from './dto/update-budget-item.dto';

export interface BudgetItemSummary {
  id: string;
  activityId: string;
  categoryId: string | null;
  name: string;
  amount: Prisma.Decimal;
  /** Jumlah seluruh Pengeluaran yang tertaut ke item ini. */
  realizedTotal: Prisma.Decimal;
  remaining: Prisma.Decimal;
  expenseCount: number;
}

@Injectable()
export class BudgetItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  async create(
    userId: string,
    activityId: string,
    dto: CreateBudgetItemDto,
  ): Promise<BudgetItemSummary> {
    await this.activities.assertOwned(userId, activityId);
    await this.assertCategoryUsable(userId, dto.categoryId);

    const item = await this.prisma.budgetItem.create({
      data: {
        activityId,
        name: dto.name,
        amount: dto.amount,
        categoryId: dto.categoryId ?? null,
      },
      select: { id: true },
    });

    return this.findOne(userId, item.id);
  }

  async findAll(userId: string, activityId: string): Promise<BudgetItemSummary[]> {
    await this.activities.assertOwned(userId, activityId);

    // Satu kueri untuk seluruh item beserta pengeluarannya — bukan satu kueri
    // per item (findOne) seperti sebelumnya.
    const items = await this.prisma.budgetItem.findMany({
      where: { activityId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        activityId: true,
        categoryId: true,
        name: true,
        amount: true,
        expenses: { select: { amount: true } },
      },
    });

    return items.map((item) => this.toSummary(item));
  }

  async findOne(userId: string, id: string): Promise<BudgetItemSummary> {
    const item = await this.prisma.budgetItem.findFirst({
      where: { id, activity: { event: { userId } } },
      select: {
        id: true,
        activityId: true,
        categoryId: true,
        name: true,
        amount: true,
        expenses: { select: { amount: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Item anggaran tidak ditemukan');
    }

    return this.toSummary(item);
  }

  private toSummary(item: {
    id: string;
    activityId: string;
    categoryId: string | null;
    name: string;
    amount: Prisma.Decimal;
    expenses: { amount: Prisma.Decimal }[];
  }): BudgetItemSummary {
    const realizedTotal = item.expenses.reduce(
      (sum, expense) => sum.plus(expense.amount),
      new Prisma.Decimal(0),
    );

    return {
      id: item.id,
      activityId: item.activityId,
      categoryId: item.categoryId,
      name: item.name,
      amount: item.amount,
      realizedTotal,
      remaining: item.amount.minus(realizedTotal),
      expenseCount: item.expenses.length,
    };
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateBudgetItemDto,
  ): Promise<BudgetItemSummary> {
    await this.assertOwned(userId, id);
    await this.assertCategoryUsable(userId, dto.categoryId);

    await this.prisma.budgetItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      },
    });

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.assertOwned(userId, id);
    await this.prisma.budgetItem.delete({ where: { id } });
  }

  async assertOwned(userId: string, id: string): Promise<void> {
    const count = await this.prisma.budgetItem.count({
      where: { id, activity: { event: { userId } } },
    });

    if (count === 0) {
      throw new NotFoundException('Item anggaran tidak ditemukan');
    }
  }

  /** Kategori harus milik Pengguna ini atau Kategori bawaan. */
  private async assertCategoryUsable(userId: string, categoryId?: string): Promise<void> {
    if (!categoryId) {
      return;
    }

    const count = await this.prisma.category.count({
      where: { id: categoryId, OR: [{ userId }, { userId: null }] },
    });

    if (count === 0) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }
  }
}
