import { Prisma } from '@prisma/client';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExpensesService } from '../expenses/expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShareInput } from './dto/set-shares.dto';

export interface SharePreview {
  participantId: string;
  participantName: string;
  amount: Prisma.Decimal;
  included: boolean;
}

@Injectable()
export class SharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesService,
  ) {}

  /**
   * Mengganti pembagian sebuah Pengeluaran. Jumlahnya harus sama persis
   * dengan nominal Pengeluaran — layar "Bagi Biaya" memakai sisa belum
   * terbagi untuk menahan tombol simpan sampai angkanya nol.
   */
  async setShares(userId: string, expenseId: string, shares: ShareInput[]) {
    const expense = await this.expenses.assertOwned(userId, expenseId);
    const eventId = await this.eventIdOfExpense(expenseId);

    const ids = shares.map((share) => share.participantId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Ada peserta yang muncul lebih dari sekali');
    }

    const participantCount = await this.prisma.participant.count({
      where: { id: { in: ids }, eventId },
    });
    if (participantCount !== ids.length) {
      throw new NotFoundException('Ada peserta pembagian yang tidak ada di acara ini');
    }

    const total = shares.reduce(
      (sum, share) => sum.plus(share.amount),
      new Prisma.Decimal(0),
    );

    if (!total.equals(expense.amount)) {
      throw new BadRequestException(
        `Sisa belum terbagi ${expense.amount.minus(total).toString()} — jumlah bagian harus sama dengan nominal pengeluaran`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.expenseShare.deleteMany({ where: { expenseId } });
      await tx.expenseShare.createMany({
        data: shares.map((share) => ({
          expenseId,
          participantId: share.participantId,
          amount: share.amount,
        })),
      });
    });

    // Acara & nominal sudah diketahui dari langkah di atas — diteruskan agar
    // preview tidak mengueri ulang keduanya.
    return this.preview(userId, expenseId, { eventId, amount: expense.amount });
  }

  /**
   * Pratinjau pembagian rata: seluruh Peserta Acara ikut, sisa pembulatan
   * ditimpakan ke peserta pertama.
   */
  async evenPreview(userId: string, expenseId: string): Promise<SharePreview[]> {
    const expense = await this.expenses.assertOwned(userId, expenseId);
    const eventId = await this.eventIdOfExpense(expenseId);

    const shares = await this.expenses.evenShares(eventId, expense.amount);

    const participants = await this.prisma.participant.findMany({
      where: { id: { in: shares.map((share) => share.participantId) } },
      select: { id: true, name: true },
    });
    const names = new Map(participants.map((participant) => [participant.id, participant.name]));

    return shares.map((share) => ({
      participantId: share.participantId,
      participantName: names.get(share.participantId) ?? 'Tanpa nama',
      amount: share.amount,
      included: true,
    }));
  }

  /** Pembagian yang tersimpan saat ini, plus sisa yang belum terbagi. */
  async preview(
    userId: string,
    expenseId: string,
    known?: { eventId: string; amount: Prisma.Decimal },
  ) {
    const expense = await this.expenses.assertOwned(userId, expenseId);
    const eventId = known?.eventId ?? (await this.eventIdOfExpense(expenseId));
    const amount = known?.amount ?? expense.amount;

    const [participants, shares] = await Promise.all([
      this.prisma.participant.findMany({
        where: { eventId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.expenseShare.findMany({
        where: { expenseId },
        select: { participantId: true, amount: true },
      }),
    ]);

    const byParticipant = new Map(shares.map((share) => [share.participantId, share.amount]));

    const rows: SharePreview[] = participants.map((participant) => {
      const shareAmount = byParticipant.get(participant.id);
      return {
        participantId: participant.id,
        participantName: participant.name,
        amount: shareAmount ?? new Prisma.Decimal(0),
        included: shareAmount !== undefined,
      };
    });

    const assigned = shares.reduce(
      (sum, share) => sum.plus(share.amount),
      new Prisma.Decimal(0),
    );

    return {
      expenseId,
      total: amount,
      assigned,
      unassigned: amount.minus(assigned),
      shares: rows,
    };
  }

  private async eventIdOfExpense(expenseId: string): Promise<string> {
    const expense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      select: { activity: { select: { eventId: true } } },
    });

    if (!expense) {
      throw new NotFoundException('Pengeluaran tidak ditemukan');
    }

    return expense.activity.eventId;
  }
}
