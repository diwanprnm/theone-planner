import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Penghapusan akun milik Pengguna sendiri.
 *
 * Urutannya penting:
 *  1. Kumpulkan path struk lebih dulu — begitu baris Pengeluaran terhapus,
 *     path-nya ikut hilang dan objek di Storage menjadi yatim.
 *  2. Hapus akun Supabase Auth. Bila langkah ini gagal, tidak ada satu pun
 *     data yang terhapus dan Pengguna bisa mencoba lagi.
 *  3. Hapus baris `User` di database kita; sisanya ikut lewat `onDelete:
 *     Cascade` (Event → Activity → BudgetItem/Expense → ExpenseShare,
 *     Participant, Category).
 *  4. Bersihkan berkas struk di Storage.
 *
 * Kalau baris database dihapus duluan lalu penghapusan Auth gagal, Pengguna
 * akan tertinggal dalam keadaan setengah terhapus yang membingungkan.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async deleteAccount(userId: string): Promise<void> {
    const receipts = await this.prisma.expense.findMany({
      where: { activity: { event: { userId } }, receiptPath: { not: null } },
      select: { receiptPath: true },
    });

    await this.supabase.deleteAuthUser(userId);

    // Sabuk pengaman: bila cascade belum sempat jalan (mis. akun Auth dihapus
    // dari dashboard Supabase), baris lokal dibersihkan di sini. Operasi ini
    // tidak melempar bila barisnya memang sudah tidak ada.
    await this.prisma.user.deleteMany({ where: { id: userId } });

    // Baris sudah hilang, jadi objek struk dibersihkan setelahnya. Kegagalan
    // di sini hanya dicatat — akun tetap terhapus.
    await Promise.all(
      receipts
        .map((row) => row.receiptPath)
        .filter((path): path is string => Boolean(path))
        .map((path) => this.supabase.removeReceipt(path)),
    );

    this.logger.log(`Akun ${userId} dihapus permanen beserta seluruh datanya`);
  }
}
