import { afterEach, describe, expect, it } from 'vitest';
import {
  cacheCategories,
  cacheEventDetail,
  cacheEvents,
  cacheExpenses,
  clearAllLocalData,
  clearQueue,
  enqueue,
  listQueue,
  queueCount,
  readCachedCategories,
  readCachedEventDetail,
  readCachedEvents,
  readCachedExpenses,
} from './db';
import type { Category, EventSummary, ExpenseView } from './types';

const event: EventSummary = {
  id: 'e1',
  name: 'Wisuda',
  startDate: '2026-10-12',
  endDate: '2026-10-14',
  status: 'DRAFT',
  fundsRaised: null,
  budgetTotal: '1000',
  realizedTotal: '200',
  remaining: '800',
  participantCount: 2,
};

const category: Category = { id: 'c1', name: 'Transport', isDefault: true, userId: null };

const expense: ExpenseView = {
  id: 'x1',
  activityId: 'a1',
  budgetItemId: null,
  categoryId: null,
  payerId: null,
  payerName: null,
  amount: '150',
  description: 'Sewa bus',
  date: '2026-10-12',
  paymentMethod: 'TUNAI',
  receiptPath: null,
  shares: [],
};

afterEach(async () => {
  await clearAllLocalData();
});

describe('antrean tulis', () => {
  it('menyimpan entri dengan nomor urut dan percobaan nol', async () => {
    const id = await enqueue({ method: 'POST', path: '/a', body: { n: 1 }, label: 'A' });

    expect(typeof id).toBe('number');
    const entries = await listQueue();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ method: 'POST', path: '/a', label: 'A', attempts: 0 });
  });

  it('mengembalikan entri dalam urutan FIFO', async () => {
    await enqueue({ method: 'POST', path: '/a', label: 'A' });
    await new Promise((resolve) => setTimeout(resolve, 2));
    await enqueue({ method: 'POST', path: '/b', label: 'B' });
    await new Promise((resolve) => setTimeout(resolve, 2));
    await enqueue({ method: 'POST', path: '/c', label: 'C' });

    expect((await listQueue()).map((entry) => entry.path)).toEqual(['/a', '/b', '/c']);
  });

  it('menghitung dan mengosongkan antrean', async () => {
    await enqueue({ method: 'POST', path: '/a', label: 'A' });
    await enqueue({ method: 'POST', path: '/b', label: 'B' });

    expect(await queueCount()).toBe(2);

    await clearQueue();

    expect(await queueCount()).toBe(0);
  });
});

describe('cache baca', () => {
  it('menyimpan dan membaca daftar acara per pengguna', async () => {
    expect(await readCachedEvents('u1')).toBeNull();

    await cacheEvents('u1', [event]);

    expect(await readCachedEvents('u1')).toEqual([event]);
    // Cache pengguna lain tidak tercampur.
    expect(await readCachedEvents('u2')).toBeNull();
  });

  it('menyimpan dan membaca detail acara', async () => {
    await cacheEventDetail(event);

    expect(await readCachedEventDetail('e1')).toEqual(event);
    expect(await readCachedEventDetail('e2')).toBeNull();
  });

  it('menyimpan dan membaca pengeluaran per kegiatan', async () => {
    await cacheExpenses('a1', [expense]);

    expect(await readCachedExpenses('a1')).toEqual([expense]);
    expect(await readCachedExpenses('a2')).toBeNull();
  });

  it('menyimpan dan membaca kategori per pengguna', async () => {
    await cacheCategories('u1', [category]);

    expect(await readCachedCategories('u1')).toEqual([category]);
    expect(await readCachedCategories('u2')).toBeNull();
  });
});

describe('clearAllLocalData', () => {
  it('menghapus antrean dan seluruh cache sekaligus', async () => {
    await enqueue({ method: 'POST', path: '/a', label: 'A' });
    await cacheEvents('u1', [event]);
    await cacheEventDetail(event);
    await cacheExpenses('a1', [expense]);
    await cacheCategories('u1', [category]);

    await clearAllLocalData();

    expect(await queueCount()).toBe(0);
    expect(await readCachedEvents('u1')).toBeNull();
    expect(await readCachedEventDetail('e1')).toBeNull();
    expect(await readCachedExpenses('a1')).toBeNull();
    expect(await readCachedCategories('u1')).toBeNull();
  });
});
