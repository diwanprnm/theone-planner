import Dexie, { type EntityTable } from 'dexie';
import type { Category, EventSummary, ExpenseView } from './types';

/**
 * Cache baca + antrean tulis (ADR-0002).
 *
 * Data setiap Pengguna privat dan tidak dibagikan, jadi tidak ada konflik
 * antar-orang yang perlu diselesaikan otomatis — cukup antrean tulis yang
 * dikirim berurutan saat koneksi kembali.
 */

/** Satu operasi tulis yang menunggu dikirim ke server. */
export interface OutboxEntry {
  id?: number;
  /** Urutan pengiriman — selalu FIFO supaya perubahan tidak saling menimpa. */
  createdAt: number;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  /** Untuk ditampilkan di sheet "Antrean sinkron". */
  label: string;
  amount?: string;
  /** Jumlah percobaan gagal; entri yang gagal tetap di antrean. */
  attempts: number;
  lastError?: string;
}

interface CachedEvents {
  /** Kunci cache; satu baris per Pengguna agar tidak tercampur. */
  key: string;
  userId: string;
  events: EventSummary[];
  cachedAt: number;
}

interface CachedEventDetail {
  id: string;
  event: EventSummary;
  cachedAt: number;
}

interface CachedExpenses {
  key: string;
  activityId: string;
  expenses: ExpenseView[];
  cachedAt: number;
}

interface CachedCategories {
  key: string;
  userId: string;
  categories: Category[];
  cachedAt: number;
}

const db = new Dexie('event-ledger') as Dexie & {
  outbox: EntityTable<OutboxEntry, 'id'>;
  cachedEvents: EntityTable<CachedEvents, 'key'>;
  cachedEventDetails: EntityTable<CachedEventDetail, 'id'>;
  cachedExpenses: EntityTable<CachedExpenses, 'key'>;
  cachedCategories: EntityTable<CachedCategories, 'key'>;
};

db.version(1).stores({
  outbox: '++id, createdAt',
  cachedEvents: 'key, userId',
  cachedEventDetails: 'id',
  cachedExpenses: 'key, activityId',
  cachedCategories: 'key, userId',
});

export { db };

/* ─── Antrean tulis ────────────────────────────────────────────────────────── */

export async function enqueue(
  entry: Omit<OutboxEntry, 'id' | 'createdAt' | 'attempts'>,
): Promise<number> {
  // `id` adalah primary key auto-increment (`++id`), jadi Dexie selalu
  // mengembalikan nomor barisnya — bukan undefined seperti tipe opsionalnya.
  const id = await db.outbox.add({ ...entry, createdAt: Date.now(), attempts: 0 });
  return id as number;
}

export async function listQueue(): Promise<OutboxEntry[]> {
  return db.outbox.orderBy('createdAt').toArray();
}

export async function queueCount(): Promise<number> {
  return db.outbox.count();
}

export async function clearQueue(): Promise<void> {
  await db.outbox.clear();
}

/* ─── Cache baca ───────────────────────────────────────────────────────────── */

export async function cacheEvents(userId: string, events: EventSummary[]): Promise<void> {
  await db.cachedEvents.put({ key: `events:${userId}`, userId, events, cachedAt: Date.now() });
}

export async function readCachedEvents(userId: string): Promise<EventSummary[] | null> {
  const row = await db.cachedEvents.get(`events:${userId}`);
  return row?.events ?? null;
}

export async function cacheEventDetail(event: EventSummary): Promise<void> {
  await db.cachedEventDetails.put({ id: event.id, event, cachedAt: Date.now() });
}

export async function readCachedEventDetail(id: string): Promise<EventSummary | null> {
  const row = await db.cachedEventDetails.get(id);
  return row?.event ?? null;
}

export async function cacheExpenses(activityId: string, expenses: ExpenseView[]): Promise<void> {
  await db.cachedExpenses.put({
    key: `expenses:${activityId}`,
    activityId,
    expenses,
    cachedAt: Date.now(),
  });
}

export async function readCachedExpenses(activityId: string): Promise<ExpenseView[] | null> {
  const row = await db.cachedExpenses.get(`expenses:${activityId}`);
  return row?.expenses ?? null;
}

export async function cacheCategories(userId: string, categories: Category[]): Promise<void> {
  await db.cachedCategories.put({
    key: `categories:${userId}`,
    userId,
    categories,
    cachedAt: Date.now(),
  });
}

export async function readCachedCategories(userId: string): Promise<Category[] | null> {
  const row = await db.cachedCategories.get(`categories:${userId}`);
  return row?.categories ?? null;
}

/** Menghapus seluruh data lokal — dipakai saat Pengguna keluar. */
export async function clearAllLocalData(): Promise<void> {
  await db.transaction('rw', db.outbox, db.cachedEvents, db.cachedEventDetails, db.cachedExpenses, db.cachedCategories, async () => {
    await Promise.all([
      db.outbox.clear(),
      db.cachedEvents.clear(),
      db.cachedEventDetails.clear(),
      db.cachedExpenses.clear(),
      db.cachedCategories.clear(),
    ]);
  });
}
