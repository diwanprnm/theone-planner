import { Prisma } from '@prisma/client';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';

const DEC = (value: string | number) => new Prisma.Decimal(value);

function makeService() {
  const prisma = {
    event: { findUniqueOrThrow: jest.fn() },
    expense: { groupBy: jest.fn() },
    category: { findMany: jest.fn() },
    participant: { findMany: jest.fn() },
  };
  const events = { assertOwned: jest.fn().mockResolvedValue(undefined) };

  const service = new ReportsService(
    prisma as unknown as PrismaService,
    events as unknown as EventsService,
  );

  return { service, prisma, events };
}

describe('ReportsService.summary', () => {
  it('menghitung total per kegiatan, total acara, dan surplus', async () => {
    const { service, prisma } = makeService();
    prisma.event.findUniqueOrThrow.mockResolvedValue({
      fundsRaised: DEC(5000),
      activities: [
        {
          id: 'a1',
          name: 'Hari H',
          budgetItems: [{ amount: DEC(1000) }],
          expenses: [{ amount: DEC(400) }],
        },
        {
          id: 'a2',
          name: 'Persiapan',
          budgetItems: [{ amount: DEC(500) }],
          expenses: [{ amount: DEC(200) }],
        },
      ],
    });

    const result = await service.summary('u1', 'e1');

    expect(result.budgetTotal.toString()).toBe('1500');
    expect(result.realizedTotal.toString()).toBe('600');
    expect(result.remaining.toString()).toBe('900');
    expect(result.surplus?.toString()).toBe('4400');
    expect(result.perActivity).toHaveLength(2);
    expect(result.perActivity[0].delta.toString()).toBe('600');
  });

  it('surplus null bila uang terkumpul belum diisi', async () => {
    const { service, prisma } = makeService();
    prisma.event.findUniqueOrThrow.mockResolvedValue({ fundsRaised: null, activities: [] });

    const result = await service.summary('u1', 'e1');

    expect(result.surplus).toBeNull();
  });
});

describe('ReportsService.byCategory', () => {
  it('mengurutkan dari terbesar dan memberi nama kategori', async () => {
    const { service, prisma } = makeService();
    prisma.expense.groupBy.mockResolvedValue([
      { categoryId: 'c1', _sum: { amount: DEC(100) }, _count: { _all: 1 } },
      { categoryId: null, _sum: { amount: DEC(300) }, _count: { _all: 2 } },
    ]);
    prisma.category.findMany.mockResolvedValue([{ id: 'c1', name: 'Transport' }]);

    const result = await service.byCategory('u1', 'e1');

    expect(result.map((row) => row.categoryName)).toEqual(['Tanpa kategori', 'Transport']);
    expect(result[0].total.toString()).toBe('300');
    expect(result[1].expenseCount).toBe(1);
  });
});

describe('ReportsService.talangan', () => {
  it('hanya menghitung pengeluaran yang punya pembayar dan mengurutkan menurun', async () => {
    const { service, prisma } = makeService();
    prisma.expense.groupBy.mockResolvedValue([
      { payerId: 'p1', _sum: { amount: DEC(200) } },
      { payerId: 'p2', _sum: { amount: DEC(500) } },
    ]);
    prisma.participant.findMany.mockResolvedValue([
      { id: 'p1', name: 'Budi' },
      { id: 'p2', name: 'Ani' },
    ]);

    const result = await service.talangan('u1', 'e1');

    expect(result.map((row) => row.participantName)).toEqual(['Ani', 'Budi']);
    expect(prisma.expense.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { activity: { eventId: 'e1' }, payerId: { not: null } } }),
    );
  });
});
