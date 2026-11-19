import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EventsService } from './events.service';

const DEC = (value: string | number) => new Prisma.Decimal(value);

function makeService() {
  const prisma = {
    event: { findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), delete: jest.fn() },
    expense: { findMany: jest.fn() },
  };
  const supabase = { removeReceipt: jest.fn().mockResolvedValue(undefined) };

  const service = new EventsService(
    prisma as unknown as PrismaService,
    supabase as unknown as SupabaseService,
  );

  return { service, prisma, supabase };
}

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'e1',
  name: 'Wisuda',
  startDate: new Date('2026-10-12'),
  endDate: new Date('2026-10-14'),
  status: 'DRAFT',
  fundsRaised: DEC(5000),
  activities: [
    {
      budgetItems: [{ amount: DEC(1000) }, { amount: DEC(500) }],
      expenses: [{ amount: DEC(200) }, { amount: DEC(300) }],
    },
  ],
  _count: { participants: 3 },
  ...overrides,
});

describe('EventsService', () => {
  it('menghitung total anggaran, realisasi, sisa, dan jumlah peserta', async () => {
    const { service, prisma } = makeService();
    prisma.event.findFirst.mockResolvedValue(row());

    const result = await service.findOne('u1', 'e1');

    expect(result.budgetTotal.toString()).toBe('1500');
    expect(result.realizedTotal.toString()).toBe('500');
    expect(result.remaining.toString()).toBe('1000');
    expect(result.participantCount).toBe(3);
    expect(result.fundsRaised?.toString()).toBe('5000');
  });

  it('findAll hanya sekali kueri daftar (tanpa N+1)', async () => {
    const { service, prisma } = makeService();
    prisma.event.findMany.mockResolvedValue([row(), row({ id: 'e2' })]);

    const result = await service.findAll('u1', {});

    expect(result).toHaveLength(2);
    expect(prisma.event.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.event.findFirst).not.toHaveBeenCalled();
  });

  it('melempar NotFound bila acara tidak ada', async () => {
    const { service, prisma } = makeService();
    prisma.event.findFirst.mockResolvedValue(null);

    await expect(service.findOne('u1', 'hilang')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mengumpulkan path struk sebelum menghapus acara', async () => {
    const { service, prisma, supabase } = makeService();
    prisma.event.count.mockResolvedValue(1);
    prisma.expense.findMany.mockResolvedValue([{ receiptPath: 'u1/x1/a.jpg' }]);
    prisma.event.delete.mockResolvedValue({ id: 'e1' });

    await service.remove('u1', 'e1');

    // Kueri struk harus terjadi sebelum penghapusan baris acara.
    expect(prisma.expense.findMany.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.event.delete.mock.invocationCallOrder[0],
    );
    expect(supabase.removeReceipt).toHaveBeenCalledWith('u1/x1/a.jpg');
  });

  it('menolak menghapus acara yang bukan milik pengguna', async () => {
    const { service, prisma } = makeService();
    prisma.event.count.mockResolvedValue(0);

    await expect(service.remove('u1', 'e1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.event.delete).not.toHaveBeenCalled();
  });
});
