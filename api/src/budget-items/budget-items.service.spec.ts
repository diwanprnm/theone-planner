import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ActivitiesService } from '../activities/activities.service';
import { PrismaService } from '../prisma/prisma.service';
import { BudgetItemsService } from './budget-items.service';

const DEC = (value: string | number) => new Prisma.Decimal(value);

function makeService() {
  const prisma = {
    budgetItem: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), delete: jest.fn() },
    category: { count: jest.fn() },
  };
  const activities = { assertOwned: jest.fn().mockResolvedValue(undefined) };

  const service = new BudgetItemsService(
    prisma as unknown as PrismaService,
    activities as unknown as ActivitiesService,
  );

  return { service, prisma, activities };
}

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'b1',
  activityId: 'a1',
  categoryId: null,
  name: 'Sewa bus',
  amount: DEC(1000),
  expenses: [{ amount: DEC(300) }, { amount: DEC(200) }],
  ...overrides,
});

describe('BudgetItemsService', () => {
  it('menghitung realisasi, sisa, dan jumlah pengeluaran', async () => {
    const { service, prisma } = makeService();
    prisma.budgetItem.findFirst.mockResolvedValue(row());

    const result = await service.findOne('u1', 'b1');

    expect(result.realizedTotal.toString()).toBe('500');
    expect(result.remaining.toString()).toBe('500');
    expect(result.expenseCount).toBe(2);
  });

  it('findAll hanya sekali kueri daftar (tanpa N+1)', async () => {
    const { service, prisma } = makeService();
    prisma.budgetItem.findMany.mockResolvedValue([row(), row({ id: 'b2' })]);

    const result = await service.findAll('u1', 'a1');

    expect(result).toHaveLength(2);
    expect(prisma.budgetItem.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.budgetItem.findFirst).not.toHaveBeenCalled();
  });

  it('menolak kategori yang bukan milik pengguna maupun bawaan', async () => {
    const { service, prisma } = makeService();
    prisma.category.count.mockResolvedValue(0);

    await expect(
      service.create('u1', 'a1', { name: 'Sewa', amount: 100, categoryId: 'c-lain' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('menolak item anggaran yang tidak ada', async () => {
    const { service, prisma } = makeService();
    prisma.budgetItem.findFirst.mockResolvedValue(null);

    await expect(service.findOne('u1', 'hilang')).rejects.toBeInstanceOf(NotFoundException);
  });
});
