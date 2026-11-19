import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, User, createClient } from '@supabase/supabase-js';
// Node 20 belum punya WebSocket bawaan; supabase-js membuat klien Realtime di
// konstruktor dan melempar galat tanpa transport. Kita tidak memakai Realtime,
// tetapi konstruktornya tetap butuh ini.
import ws from 'ws';

/**
 * Pembungkus Supabase. Backend TIDAK menerbitkan token sendiri — ia hanya
 * memverifikasi token yang diterbitkan Supabase Auth (lihat ADR-0001).
 *
 * Klien ini memakai service role key dan karenanya berhak penuh; jangan
 * pernah mengekspos nilainya ke klien.
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient;
  private readonly receiptsBucket: string;

  constructor(private readonly config: ConfigService) {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.client = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      realtime: { transport: ws as never },
    });
    this.receiptsBucket = this.config.get<string>('SUPABASE_RECEIPTS_BUCKET', 'receipts');
  }

  /** Klien mentah, untuk operasi Storage. */
  get raw(): SupabaseClient {
    return this.client;
  }

  /**
   * Memverifikasi access token dan mengembalikan Pengguna Supabase.
   * Melempar UnauthorizedException bila token tidak valid atau kedaluwarsa.
   */
  async getUserFromToken(accessToken: string): Promise<User> {
    const { data, error } = await this.client.auth.getUser(accessToken);

    if (error || !data.user) {
      this.logger.debug(`Token ditolak: ${error?.message ?? 'pengguna tidak ditemukan'}`);
      throw new UnauthorizedException('Token tidak valid atau sudah kedaluwarsa');
    }

    return data.user;
  }

  /** Mengunggah foto struk, mengembalikan path objek (bukan URL publik). */
  async uploadReceipt(path: string, file: Buffer, contentType: string): Promise<string> {
    const { error } = await this.client.storage
      .from(this.receiptsBucket)
      .upload(path, file, { contentType, upsert: false });

    if (error) {
      throw new Error(`Gagal mengunggah struk: ${error.message}`);
    }

    return path;
  }

  /** URL bertanda tangan berumur pendek untuk membaca foto struk. */
  async createReceiptSignedUrl(path: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.receiptsBucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data) {
      throw new Error(`Gagal membuat URL struk: ${error?.message ?? 'tidak ada data'}`);
    }

    return data.signedUrl;
  }

  /** Menghapus objek struk. Dipanggil saat Pengeluaran atau Event dihapus. */
  async removeReceipt(path: string): Promise<void> {
    const { error } = await this.client.storage.from(this.receiptsBucket).remove([path]);

    if (error) {
      this.logger.warn(`Gagal menghapus struk ${path}: ${error.message}`);
    }
  }

  /**
   * Menghapus akun Supabase Auth beserta seluruh sesinya. Dipakai saat
   * Pengguna meminta akunnya dihapus permanen — baris database kita ikut
   * terhapus lewat cascade, tetapi akun Auth harus dihapus terpisah karena
   * berada di skema `auth` milik Supabase.
   */
  async deleteAuthUser(userId: string): Promise<void> {
    const { error } = await this.client.auth.admin.deleteUser(userId);

    if (error) {
      throw new Error(`Gagal menghapus akun: ${error.message}`);
    }
  }
}
