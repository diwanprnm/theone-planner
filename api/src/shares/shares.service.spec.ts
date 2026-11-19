import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ExpensesService } from '../expenses/expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import { SharesService } from './shares.service';

const DEC = (value: string | number) => new Prisma.Decimal(value);

const P1 = '11111111-1111-4111-8111-111111111111';
const P2 = '22222222-2222-4222-8222-222222222222';

function makeService() {
  const tx = {
    expenseShare: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const prisma = {
    expense: { findUnique: jest.fn() },
    participant: { count: jest.fn(), findMany: jest.fn() },
    expenseShare: { findMany: jest.fn() },
    $transaction: jest.fn(async (callback: (client: unknown) => unknown) => callback(tx)),
  };
  const expenses = {
    assertOwned: jest.fn().mockResolvedValue({ id: 'x1', activityId: 'a1', amount: DEC(100) }),
    evenShares: jest.fn(),
  };

  const service = new SharesService(
    prisma as unknown as PrismaService,
    expenses as unknown as ExpensesService,
  );

  return { service, prisma, tx, expenses };
}

describe('SharesService.setShares', () => {
  it('menolak peserta yang muncul lebih dari sekali', async () => {
    const { service, prisma } = makeService();
    prisma.expense.findUnique.mockResolvedValue({ activity: { eventId: 'e1' } });

    await expect(
      service.setShares('u1', 'x1', [
        { participantId: P1, amount: 50 },
        { participantId: P1, amount: 50 },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('menolak peserta yang bukan anggota acara', async () => {
    const { service, prisma } = makeService();
    prisma.expense.findUnique.mockResolvedValue({ activity: { eventId: 'e1' } });
    prisma.participant.count.mockResolvedValue(1);

    await expect(
      service.setShares('u1', 'x1', [
        { participantId: P1, amount: 50 },
        { participantId: P2, amount: 50 },
      ]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('menolak jumlah bagian yang tidak sama dengan nominal', async () => {
    const { service, prisma } = makeService();
    prisma.expense.findUnique.mockResolvedValue({ activity: { eventId: 'e1' } });
    prisma.participant.count.mockResolvedValue(1);

    await expect(
      service.setShares('u1', 'x1', [{ participantId: P1, amount: 40 }]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('mengganti bagian lalu mengembalikan pratinjau dengan sisa nol', async () => {
    const { service, prisma, tx } = makeService();
    prisma.expense.findUnique.mockResolvedValue({ activity: { eventId: 'e1' } });
    prisma.participant.count.mockResolvedValue(2);
    prisma.participant.findMany.mockResolvedValue([
      { id: P1, name: 'Budi' },
      { id: P2, name: 'Ani' },
    ]);
    prisma.expenseShare.findMany.mockResolvedValue([
      { participantId: P1, amount: DEC(70) },
      { participantId: P2, amount: DEC(30) },
    ]);

    const result = await service.setShares('u1', 'x1', [
      { participantId: P1, amount: 70 },
      { participantId: P2, amount: 30 },
    ]);

    expect(tx.expenseShare.deleteMany).toHaveBeenCalledWith({ where: { expenseId: 'x1' } });
    expect(tx.expenseShare.createMany).toHaveBeenCalledTimes(1);
    expect(result.assigned.toString()).toBe('100');
    expect(result.unassigned.toString()).toBe('0');
    expect(result.shares.map((share) => share.included)).toEqual([true, true]);
  });
});

describe('SharesService.preview', () => {
  it('menandai peserta tanpa bagian sebagai belum termasuk', async () => {
    const { service, prisma } = makeService();
    prisma.expense.findUnique.mockResolvedValue({ activity: { eventId: 'e1' } });
    prisma.participant.findMany.mockResolvedValue([
      { id: P1, name: 'Budi' },
      { id: P2, name: 'Ani' },
    ]);
    prisma.expenseShare.findMany.mockResolvedValue([{ participantId: P1, amount: DEC(100) }]);

    const result = await service.preview('u1', 'x1');

    expect(result.total.toString()).toBe('100');
    expect(result.assigned.toString()).toBe('100');
    expect(result.unassigned.toString()).toBe('0');
    expect(result.shares).toEqual([
      { participantId: P1, participantName: 'Budi', amount: DEC(100), included: true },
      { participantId: P2, participantName: 'Ani', amount: DEC(0), included: false },
    ]);
  });
});
