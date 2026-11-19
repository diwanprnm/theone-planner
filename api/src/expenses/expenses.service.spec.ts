import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ActivitiesService } from '../activities/activities.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ExpensesService } from './expenses.service';

const DEC = (value: string | number) => new Prisma.Decimal(value);

const PARTICIPANT_A = '11111111-1111-4111-8111-111111111111';
const PARTICIPANT_B = '22222222-2222-4222-8222-222222222222';

function makeService() {
  const prisma = {
    activity: { findUnique: jest.fn() },
    budgetItem: { count: jest.fn() },
    category: { count: jest.fn() },
    participant: { count: jest.fn(), findMany: jest.fn() },
    expense: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
    expenseShare: { deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const activities = { assertOwned: jest.fn().mockResolvedValue(undefined) };
  const supabase = { removeReceipt: jest.fn().mockResolvedValue(undefined) };

  const service = new ExpensesService(
    prisma as unknown as PrismaService,
    activities as unknown as ActivitiesService,
    supabase as unknown as SupabaseService,
  );

  prisma.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(prisma));

  return { service, prisma, activities, supabase };
}

const baseDto = {
  amount: 100,
  description: 'Sewa bus',
  date: '2026-10-12',
  paymentMethod: 'TUNAI' as const,
};

describe('ExpensesService.evenShares', () => {
  it('membagi rata dan menimpakan sisa pembulatan ke peserta pertama', async () => {
    const { service, prisma } = makeService();
    prisma.participant.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]);

    const shares = await service.evenShares('e1', DEC(100));

    expect(shares.map((share) => share.amount.toString())).toEqual(['33.34', '33.33', '33.33']);
  });

  it('menolak bila acara belum punya peserta', async () => {
    const { service, prisma } = makeService();
    prisma.participant.findMany.mockResolvedValue([]);

    await expect(service.evenShares('e1', DEC(100))).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ExpensesService.create', () => {
  function primeCreate(prisma: ReturnType<typeof makeService>['prisma']) {
    prisma.activity.findUnique.mockResolvedValue({ eventId: 'e1' });
    prisma.expense.create.mockResolvedValue({ id: 'x1' });
    prisma.expense.findFirst.mockResolvedValue({
      id: 'x1',
      activityId: 'a1',
      budgetItemId: null,
      categoryId: null,
      payerId: null,
      amount: DEC(100),
      description: 'Sewa bus',
      date: new Date('2026-10-12'),
      paymentMethod: 'TUNAI',
      receiptPath: null,
      payer: null,
      shares: [],
    });
  }

  it('membagi rata otomatis bila tidak ada bagian yang dikirim', async () => {
    const { service, prisma } = makeService();
    primeCreate(prisma);
    prisma.participant.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

    await service.create('u1', 'a1', baseDto);

    const data = prisma.expense.create.mock.calls[0][0].data;
    expect(data.shares.create.map((share: { amount: Prisma.Decimal }) => share.amount.toString())).toEqual([
      '50',
      '50',
    ]);
  });

  it('menolak bagian yang jumlahnya tidak sama dengan nominal', async () => {
    const { service, prisma } = makeService();
    primeCreate(prisma);
    prisma.participant.count.mockResolvedValue(1);

    await expect(
      service.create('u1', 'a1', {
        ...baseDto,
        shares: [{ participantId: PARTICIPANT_A, amount: 40 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  it('memakai bagian eksplisit bila jumlahnya pas', async () => {
    const { service, prisma } = makeService();
    primeCreate(prisma);
    prisma.participant.count.mockResolvedValue(2);

    await service.create('u1', 'a1', {
      ...baseDto,
      shares: [
        { participantId: PARTICIPANT_A, amount: 70 },
        { participantId: PARTICIPANT_B, amount: 30 },
      ],
    });

    const data = prisma.expense.create.mock.calls[0][0].data;
    expect(data.shares.create).toEqual([
      { participantId: PARTICIPANT_A, amount: DEC(70) },
      { participantId: PARTICIPANT_B, amount: DEC(30) },
    ]);
  });
});

describe('ExpensesService.update', () => {
  it('membagi ulang rata saat nominal berubah tanpa bagian baru', async () => {
    const { service, prisma } = makeService();
    prisma.expense.findFirst
      // assertOwned
      .mockResolvedValueOnce({ id: 'x1', activityId: 'a1', amount: DEC(100), receiptPath: null })
      // findOne di akhir
      .mockResolvedValueOnce({
        id: 'x1',
        activityId: 'a1',
        budgetItemId: null,
        categoryId: null,
        payerId: null,
        amount: DEC(90),
        description: 'Sewa bus',
        date: new Date('2026-10-12'),
        paymentMethod: 'TUNAI',
        receiptPath: null,
        payer: null,
        shares: [],
      });
    prisma.activity.findUnique.mockResolvedValue({ eventId: 'e1' });
    prisma.participant.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    prisma.expense.update.mockResolvedValue({ id: 'x1' });

    await service.update('u1', 'x1', { amount: 90 });

    expect(prisma.expenseShare.deleteMany).toHaveBeenCalledWith({ where: { expenseId: 'x1' } });
    const created = prisma.expenseShare.createMany.mock.calls[0][0].data;
    expect(created.map((share: { amount: Prisma.Decimal }) => share.amount.toString())).toEqual(['45', '45']);
  });
});

describe('ExpensesService.remove', () => {
  it('menghapus objek struk setelah barisnya hilang', async () => {
    const { service, prisma, supabase } = makeService();
    prisma.expense.findFirst.mockResolvedValue({
      id: 'x1',
      activityId: 'a1',
      amount: DEC(100),
      receiptPath: 'u1/x1/struk.jpg',
    });
    prisma.expense.delete.mockResolvedValue({ id: 'x1' });

    await service.remove('u1', 'x1');

    expect(prisma.expense.delete).toHaveBeenCalledWith({ where: { id: 'x1' } });
    expect(supabase.removeReceipt).toHaveBeenCalledWith('u1/x1/struk.jpg');
  });

  it('tidak menyentuh Storage bila tidak ada struk', async () => {
    const { service, prisma, supabase } = makeService();
    prisma.expense.findFirst.mockResolvedValue({
      id: 'x1',
      activityId: 'a1',
      amount: DEC(100),
      receiptPath: null,
    });
    prisma.expense.delete.mockResolvedValue({ id: 'x1' });

    await service.remove('u1', 'x1');

    expect(supabase.removeReceipt).not.toHaveBeenCalled();
  });
});
