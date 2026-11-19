import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ActivitiesService } from './activities.service';

const DEC = (value: string | number) => new Prisma.Decimal(value);

function makeService() {
  const prisma = {
    activity: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), delete: jest.fn() },
    expense: { findMany: jest.fn() },
  };
  const events = { assertOwned: jest.fn().mockResolvedValue(undefined) };
  const supabase = { removeReceipt: jest.fn().mockResolvedValue(undefined) };

  const service = new ActivitiesService(
    prisma as unknown as PrismaService,
    events as unknown as EventsService,
    supabase as unknown as SupabaseService,
  );

  return { service, prisma, events, supabase };
}

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'a1',
  eventId: 'e1',
  name: 'Hari H',
  sortOrder: 0,
  date: new Date('2026-10-12'),
  time: '08:00',
  location: 'Balai',
  notes: null,
  budgetItems: [{ amount: DEC(1000) }, { amount: DEC(500) }],
  expenses: [{ amount: DEC(200) }],
  ...overrides,
});

describe('ActivitiesService', () => {
  it('menghitung anggaran, realisasi, dan sisa dari baris anak', async () => {
    const { service, prisma } = makeService();
    prisma.activity.findFirst.mockResolvedValue(row());

    const result = await service.findOne('u1', 'a1');

    expect(result.budgetTotal.toString()).toBe('1500');
    expect(result.realizedTotal.toString()).toBe('200');
    expect(result.remaining.toString()).toBe('1300');
  });

  it('findAll hanya sekali kueri daftar (tanpa N+1)', async () => {
    const { service, prisma } = makeService();
    prisma.activity.findMany.mockResolvedValue([row(), row({ id: 'a2' })]);

    const result = await service.findAll('u1', 'e1');

    expect(result).toHaveLength(2);
    expect(prisma.activity.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.activity.findFirst).not.toHaveBeenCalled();
  });

  it('melempar NotFound bila kegiatan tidak ada', async () => {
    const { service, prisma } = makeService();
    prisma.activity.findFirst.mockResolvedValue(null);

    await expect(service.findOne('u1', 'hilang')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('membersihkan struk pengeluaran saat kegiatan dihapus', async () => {
    const { service, prisma, supabase } = makeService();
    prisma.activity.count.mockResolvedValue(1);
    prisma.expense.findMany.mockResolvedValue([
      { receiptPath: 'u1/x1/a.jpg' },
      { receiptPath: null },
      { receiptPath: 'u1/x2/b.jpg' },
    ]);
    prisma.activity.delete.mockResolvedValue({ id: 'a1' });

    await service.remove('u1', 'a1');

    expect(prisma.activity.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
    expect(supabase.removeReceipt).toHaveBeenCalledTimes(2);
    expect(supabase.removeReceipt).toHaveBeenCalledWith('u1/x1/a.jpg');
    expect(supabase.removeReceipt).toHaveBeenCalledWith('u1/x2/b.jpg');
  });

  it('menolak menghapus kegiatan yang bukan milik pengguna', async () => {
    const { service, prisma } = makeService();
    prisma.activity.count.mockResolvedValue(0);

    await expect(service.remove('u1', 'a1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.activity.delete).not.toHaveBeenCalled();
  });
});
