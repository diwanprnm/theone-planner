import { Injectable, NotFoundException } from '@nestjs/common';
import { ExpensesService } from '../expenses/expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Bentuk berkas yang dihasilkan Multer (memory storage).
 *
 * Ditulis sendiri alih-alih memakai `Express.Multer.File` supaya tidak
 * bergantung pada paket `@types/multer` yang belum terpasang di proyek ini.
 */
export interface UploadedReceiptFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface ReceiptView {
  receiptPath: string;
  signedUrl: string;
}

/** Ekstensi aman berdasarkan MIME yang diizinkan — nama asli tidak dipercaya. */
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Menyimpan foto struk ke Supabase Storage dan menautkannya ke Pengeluaran.
   *
   * Path diawali `userId/` supaya setiap Pengguna hanya menyentuh berkasnya
   * sendiri — kebijakan Storage bisa memakai prefiks ini sebagai batas.
   * Nama berkas dibuat dari id pengeluaran + waktu, bukan nama asli, supaya
   * tidak ada karakter aneh yang lolos ke path objek.
   */
  async upload(
    userId: string,
    expenseId: string,
    file: UploadedReceiptFile,
  ): Promise<ReceiptView> {
    const expense = await this.expenses.assertOwned(userId, expenseId);
    const extension = EXTENSION_BY_MIME[file.mimetype] ?? 'bin';
    const path = `${userId}/${expense.id}/${Date.now()}.${extension}`;

    await this.supabase.uploadReceipt(path, file.buffer, file.mimetype);

    // Ganti foto lama bila ada — berkas lama dibersihkan agar tidak menumpuk.
    if (expense.receiptPath && expense.receiptPath !== path) {
      await this.supabase.removeReceipt(expense.receiptPath);
    }

    await this.prisma.expense.update({
      where: { id: expense.id },
      data: { receiptPath: path },
    });

    const signedUrl = await this.supabase.createReceiptSignedUrl(path);

    return { receiptPath: path, signedUrl };
  }

  async signedUrl(userId: string, expenseId: string): Promise<ReceiptView> {
    const expense = await this.expenses.assertOwned(userId, expenseId);

    if (!expense.receiptPath) {
      throw new NotFoundException('Pengeluaran ini belum punya foto struk');
    }

    const signedUrl = await this.supabase.createReceiptSignedUrl(expense.receiptPath);

    return { receiptPath: expense.receiptPath, signedUrl };
  }

  async remove(userId: string, expenseId: string): Promise<void> {
    const expense = await this.expenses.assertOwned(userId, expenseId);

    if (!expense.receiptPath) {
      return;
    }

    await this.supabase.removeReceipt(expense.receiptPath);
    await this.prisma.expense.update({
      where: { id: expense.id },
      data: { receiptPath: null },
    });
  }
}
