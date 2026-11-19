import { api, ApiError } from './api';
import { listQueue, db, type OutboxEntry } from './db';

/**
 * Pengirim antrean tulis (ADR-0002).
 *
 * Dikirim BERURUTAN dan berhenti pada kegagalan pertama — bukan mencoba
 * melewatinya. Ini penting: bila "catat pengeluaran A" gagal, pengeluaran B
 * setelahnya tetap dikirim nanti setelah A berhasil, sehingga urutan
 * perubahan di server sama dengan urutan pengguna mencatatnya.
 */

export interface SyncResult {
  /** Jumlah entri yang berhasil terkirim pada percobaan ini. */
  sent: number;
  /**
   * Jumlah entri yang gagal pada percobaan ini. Pengiriman berhenti pada
   * kegagalan pertama, jadi nilainya 0 atau 1 — bukan jumlah sisa antrean.
   */
  failed: number;
  /** Galat dari entri pertama yang gagal, untuk ditampilkan ke pengguna. */
  error?: string;
  /** True bila kegagalan bersifat sementara (jaringan/5xx), bukan 4xx. */
  retryable: boolean;
}

let syncing = false;

export function isSyncing(): boolean {
  return syncing;
}

export async function flushQueue(): Promise<SyncResult> {
  if (syncing) {
    return { sent: 0, failed: 0, retryable: true };
  }

  syncing = true;
  let sent = 0;

  try {
    const entries = await listQueue();

    for (const entry of entries) {
      try {
        await send(entry);
        await db.outbox.delete(entry.id!);
        sent += 1;
      } catch (error) {
        const retryable = isRetryable(error);
        const message = error instanceof Error ? error.message : 'Gagal mengirim';

        // Catat percobaan & galat terakhir. Entri TETAP di antrean — termasuk
        // galat 4xx. Menghapusnya diam-diam berarti pekerjaan pengguna hilang
        // tanpa jejak; lebih baik ia melihatnya tersangkut dan bisa menyelesaikan
        // sendiri (mis. memperbaiki data lalu mengirim ulang).
        await db.outbox.update(entry.id!, {
          attempts: entry.attempts + 1,
          lastError: message,
        });

        // Berhenti pada kegagalan pertama supaya urutan perubahan di server
        // sama dengan urutan pengguna mencatatnya. Sisanya menunggu.
        return { sent, failed: 1, error: message, retryable };
      }
    }

    return { sent, failed: 0, retryable: true };
  } finally {
    syncing = false;
  }
}

async function send(entry: OutboxEntry): Promise<void> {
  switch (entry.method) {
    case 'POST':
      await api.post(entry.path, entry.body);
      break;
    case 'PATCH':
      await api.patch(entry.path, entry.body);
      break;
    case 'PUT':
      await api.put(entry.path, entry.body);
      break;
    case 'DELETE':
      await api.delete(entry.path);
      break;
  }
}

/**
 * 4xx berarti permintaan itu sendiri yang salah (mis. validasi), sehingga
 * mengulanginya tidak akan menolong. 5xx dan galat jaringan masih layak coba.
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status >= 500 || error.status === 429;
  }

  // fetch gagal total (offline) → TypeError
  return true;
}
