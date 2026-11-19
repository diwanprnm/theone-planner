import { PaymentMethod, Prisma } from '@prisma/client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivitiesService } from '../activities/activities.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

export interface ExpenseShareView {
  participantId: string;
  participantName: string;
  amount: Prisma.Decimal;
}

/**
 * Bagian yang sudah dinormalkan ke Decimal — bentuk internal service, dipakai
 * baik untuk hasil bagi rata maupun masukan DTO. `ExpenseShareInput` (DTO)
 * masih memakai `number` karena datang dari JSON.
 */
export interface ResolvedShare {
  participantId: string;
  amount: Prisma.Decimal;
}

export interface ExpenseView {
  id: string;
  activityId: string;
  budgetItemId: string | null;
  categoryId: string | null;
  payerId: string | null;
  payerName: string | null;
  amount: Prisma.Decimal;
  description: string;
  date: Date;
  paymentMethod: PaymentMethod;
  receiptPath: string | null;
  shares: ExpenseShareView[];
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly supabase: SupabaseService,
  ) {}

  async create(userId: string, activityId: string, dto: CreateExpenseDto): Promise<ExpenseView> {
    await this.activities.assertOwned(userId, activityId);

    const eventId = await this.eventIdOfActivity(activityId);
    await this.assertReferences(userId, eventId, activityId, dto);

    const shares: ResolvedShare[] =
      dto.shares && dto.shares.length > 0
        ? dto.shares.map((share) => ({
            participantId: share.participantId,
            amount: new Prisma.Decimal(share.amount),
          }))
        : await this.evenShares(eventId, new Prisma.Decimal(dto.amount));

    this.assertSharesBalance(new Prisma.Decimal(dto.amount), shares);

    const expense = await this.prisma.expense.create({
      data: {
        activityId,
        budgetItemId: dto.budgetItemId ?? null,
        categoryId: dto.categoryId ?? null,
        payerId: dto.payerId ?? null,
        amount: dto.amount,
        description: dto.description,
        date: new Date(dto.date),
        paymentMethod: dto.paymentMethod,
        receiptPath: dto.receiptPath ?? null,
        shares: {
          create: shares.map((share) => ({
            participantId: share.participantId,
            amount: share.amount,
          })),
        },
      },
      select: { id: true },
    });

    return this.findOne(userId, expense.id);
  }

  async findAll(userId: string, activityId: string): Promise<ExpenseView[]> {
    await this.activities.assertOwned(userId, activityId);

    // Satu kueri untuk seluruh Pengeluaran beserta pembayar & bagiannya —
    // bukan satu kueri per Pengeluaran (findOne) seperti sebelumnya.
    const expenses = await this.prisma.expense.findMany({
      where: { activityId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        activityId: true,
        budgetItemId: true,
        categoryId: true,
        payerId: true,
        amount: true,
        description: true,
        date: true,
        paymentMethod: true,
        receiptPath: true,
        payer: { select: { name: true } },
        shares: {
          orderBy: { createdAt: 'asc' },
          select: {
            participantId: true,
            amount: true,
            participant: { select: { name: true } },
          },
        },
      },
    });

    return expenses.map((expense) => this.toView(expense));
  }

  async findOne(userId: string, id: string): Promise<ExpenseView> {
    const expense = await this.prisma.expense.findFirst({
      where: { id, activity: { event: { userId } } },
      select: {
        id: true,
        activityId: true,
        budgetItemId: true,
        categoryId: true,
        payerId: true,
        amount: true,
        description: true,
        date: true,
        paymentMethod: true,
        receiptPath: true,
        payer: { select: { name: true } },
        shares: {
          orderBy: { createdAt: 'asc' },
          select: {
            participantId: true,
            amount: true,
            participant: { select: { name: true } },
          },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException('Pengeluaran tidak ditemukan');
    }

    return this.toView(expense);
  }

  private toView(expense: {
    id: string;
    activityId: string;
    budgetItemId: string | null;
    categoryId: string | null;
    payerId: string | null;
    amount: Prisma.Decimal;
    description: string;
    date: Date;
    paymentMethod: PaymentMethod;
    receiptPath: string | null;
    payer: { name: string } | null;
    shares: {
      participantId: string;
      amount: Prisma.Decimal;
      participant: { name: string };
    }[];
  }): ExpenseView {
    return {
      id: expense.id,
      activityId: expense.activityId,
      budgetItemId: expense.budgetItemId,
      categoryId: expense.categoryId,
      payerId: expense.payerId,
      payerName: expense.payer?.name ?? null,
      amount: expense.amount,
      description: expense.description,
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      receiptPath: expense.receiptPath,
      shares: expense.shares.map((share) => ({
        participantId: share.participantId,
        participantName: share.participant.name,
        amount: share.amount,
      })),
    };
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto): Promise<ExpenseView> {
    const current = await this.assertOwned(userId, id);
    const eventId = await this.eventIdOfActivity(current.activityId);
    await this.assertReferences(userId, eventId, current.activityId, dto);

    const amount = dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : current.amount;
    const shares: ResolvedShare[] | undefined =
      dto.shares && dto.shares.length > 0
        ? dto.shares.map((share) => ({
            participantId: share.participantId,
            amount: new Prisma.Decimal(share.amount),
          }))
        : undefined;

    if (shares) {
      this.assertSharesBalance(amount, shares);
    } else if (dto.amount !== undefined) {
      // Nominal berubah tanpa pembagian baru — bagi ulang rata agar total tetap sinkron.
      const even = await this.evenShares(eventId, amount);
      await this.prisma.$transaction(async (tx) => {
        await tx.expenseShare.deleteMany({ where: { expenseId: id } });
        await tx.expenseShare.createMany({
          data: even.map((share) => ({
            expenseId: id,
            participantId: share.participantId,
            amount: share.amount,
          })),
        });
      });
    }

    await this.prisma.expense.update({
      where: { id },
      data: {
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.paymentMethod !== undefined ? { paymentMethod: dto.paymentMethod } : {}),
        ...(dto.budgetItemId !== undefined ? { budgetItemId: dto.budgetItemId } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.payerId !== undefined ? { payerId: dto.payerId } : {}),
        ...(dto.receiptPath !== undefined ? { receiptPath: dto.receiptPath } : {}),
      },
    });

    if (shares) {
      await this.prisma.$transaction(async (tx) => {
        await tx.expenseShare.deleteMany({ where: { expenseId: id } });
        await tx.expenseShare.createMany({
          data: shares.map((share) => ({
            expenseId: id,
            participantId: share.participantId,
            amount: share.amount,
          })),
        });
      });
    }

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const expense = await this.assertOwned(userId, id);
    await this.prisma.expense.delete({ where: { id } });

    // Baris terhapus lewat cascade, tetapi objek struk di Storage tidak —
    // jadi berkasnya dibersihkan terpisah. Kegagalan di sini tidak menahan
    // penghapusan (metodenya hanya mencatat peringatan).
    if (expense.receiptPath) {
      await this.supabase.removeReceipt(expense.receiptPath);
    }
  }

  async assertOwned(userId: string, id: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, activity: { event: { userId } } },
      select: { id: true, activityId: true, amount: true, receiptPath: true },
    });

    if (!expense) {
      throw new NotFoundException('Pengeluaran tidak ditemukan');
    }

    return expense;
  }

  /**
   * Membagi rata ke seluruh Peserta Acara. Sisa pembulatan (akibat pecahan
   * rupiah) ditimpakan ke Peserta pertama supaya jumlahnya tetap persis.
   */
  async evenShares(eventId: string, amount: Prisma.Decimal): Promise<ResolvedShare[]> {
    const participants = await this.prisma.participant.findMany({
      where: { eventId },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (participants.length === 0) {
      throw new BadRequestException(
        'Belum ada peserta di acara ini, sehingga biaya tidak bisa dibagi',
      );
    }

    const count = participants.length;
    const base = amount.dividedBy(count).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
    const remainder = amount.minus(base.times(count));

    return participants.map((participant, index) => ({
      participantId: participant.id,
      amount: index === 0 ? base.plus(remainder) : base,
    }));
  }

  private assertSharesBalance(amount: Prisma.Decimal, shares: ResolvedShare[]): void {
    const total = shares.reduce(
      (sum, share) => sum.plus(share.amount),
      new Prisma.Decimal(0),
    );

    if (!total.equals(amount)) {
      throw new BadRequestException(
        `Jumlah bagian (${total.toString()}) tidak sama dengan nominal pengeluaran (${amount.toString()})`,
      );
    }
  }

  /** Memastikan semua id yang dirujuk memang berada di Acara milik Pengguna. */
  private async assertReferences(
    userId: string,
    eventId: string,
    activityId: string,
    dto: CreateExpenseDto | UpdateExpenseDto,
  ): Promise<void> {
    if (dto.budgetItemId) {
      const count = await this.prisma.budgetItem.count({
        where: { id: dto.budgetItemId, activityId },
      });
      if (count === 0) {
        throw new NotFoundException('Item anggaran tidak ditemukan di kegiatan ini');
      }
    }

    if (dto.categoryId) {
      const count = await this.prisma.category.count({
        where: { id: dto.categoryId, OR: [{ userId }, { userId: null }] },
      });
      if (count === 0) {
        throw new NotFoundException('Kategori tidak ditemukan');
      }
    }

    if (dto.payerId) {
      const count = await this.prisma.participant.count({
        where: { id: dto.payerId, eventId },
      });
      if (count === 0) {
        throw new NotFoundException('Pembayar tidak ditemukan di acara ini');
      }
    }

    if (dto.shares && dto.shares.length > 0) {
      const ids = dto.shares.map((share) => share.participantId);
      const count = await this.prisma.participant.count({
        where: { id: { in: ids }, eventId },
      });
      if (count !== new Set(ids).size) {
        throw new NotFoundException('Ada peserta pembagian yang tidak ada di acara ini');
      }
    }
  }

  private async eventIdOfActivity(activityId: string): Promise<string> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { eventId: true },
    });

    if (!activity) {
      throw new NotFoundException('Kegiatan tidak ditemukan');
    }

    return activity.eventId;
  }
}
