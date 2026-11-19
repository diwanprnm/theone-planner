import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { flushQueue } from '../lib/outbox';
import { useOnline } from './useOnline';

export interface SyncState {
  /** Jumlah operasi yang masih menunggu dikirim. */
  pending: number;
  syncing: boolean;
  error: string | null;
  /** Kirim manual — dipakai tombol "Sinkron sekarang". */
  flush: () => Promise<void>;
}

/**
 * Menjaga antrean tulis tetap terkirim: otomatis saat kembali online,
 * dan menyediakan jumlah menunggu untuk pil status.
 */
export function useSync(): SyncState {
  const online = useOnline();
  const pending = useLiveQuery(() => db.outbox.count(), [], 0) ?? 0;
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Entri yang gagal karena 4xx tidak akan berhasil bila diulang otomatis —
  // menandainya mencegah percobaan berulang tanpa henti. Dikirim ulang hanya
  // saat pengguna menekan "Sinkron sekarang".
  const [blocked, setBlocked] = useState(false);

  const flush = useCallback(async () => {
    if (!navigator.onLine) {
      setError('Masih offline — antrean akan dikirim saat koneksi kembali.');
      return;
    }

    setSyncing(true);
    setError(null);

    try {
      const result = await flushQueue();
      setError(result.error ?? null);
      // Kegagalan sementara (jaringan/5xx) boleh dicoba lagi otomatis;
      // kegagalan permanen (4xx) berhenti sampai pengguna bertindak.
      setBlocked(result.error !== undefined && !result.retryable);
    } finally {
      setSyncing(false);
    }
  }, []);

  // Kirim otomatis begitu kembali online.
  useEffect(() => {
    if (online && pending > 0 && !syncing && !blocked) {
      void flush();
    }
  }, [online, pending, syncing, blocked, flush]);

  return { pending, syncing, error, flush };
}
