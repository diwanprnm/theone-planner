import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// ApiError asli dipertahankan supaya `instanceof` di isRetryable tetap berlaku.
vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return { ...actual, api: apiMock };
});

// `./api` mengimpor `./supabase`, yang membuat klien Supabase saat modul dimuat.
// Node 20 tidak punya WebSocket bawaan sehingga pembuatan klien itu melempar;
// tiru modulnya supaya ApiError asli tetap bisa dimuat.
vi.mock('./supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
  supabaseConfigError: null,
}));

import { ApiError } from './api';
import { clearQueue, listQueue, enqueue } from './db';
import { flushQueue, isSyncing } from './outbox';

/** Menunggu antrean microtask supaya efek samping async selesai. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('flushQueue', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await clearQueue();
  });

  afterEach(async () => {
    await clearQueue();
  });

  it('mengirim seluruh entri berurutan lalu mengosongkan antrean', async () => {
    apiMock.post.mockResolvedValue(undefined);
    await enqueue({ method: 'POST', path: '/a', body: { n: 1 }, label: 'A' });
    await enqueue({ method: 'POST', path: '/b', body: { n: 2 }, label: 'B' });

    const result = await flushQueue();

    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.error).toBeUndefined();
    // Urutan FIFO dipertahankan.
    expect(apiMock.post.mock.calls.map((call) => call[0])).toEqual(['/a', '/b']);
    expect(await listQueue()).toHaveLength(0);
  });

  it('berhenti pada kegagalan pertama dan menahan sisanya', async () => {
    apiMock.post
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ApiError('Server mati', 500));
    await enqueue({ method: 'POST', path: '/a', body: {}, label: 'A' });
    await enqueue({ method: 'POST', path: '/b', body: {}, label: 'B' });
    await enqueue({ method: 'POST', path: '/c', body: {}, label: 'C' });

    const result = await flushQueue();

    expect(result.sent).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.error).toBe('Server mati');
    expect(result.retryable).toBe(true);
    // /a terkirim; /b gagal (tetap di antrean); /c belum dicoba.
    expect(apiMock.post.mock.calls.map((call) => call[0])).toEqual(['/a', '/b']);

    const sisa = await listQueue();
    expect(sisa.map((entry) => entry.path)).toEqual(['/b', '/c']);
    expect(sisa[0].attempts).toBe(1);
    expect(sisa[0].lastError).toBe('Server mati');
  });

  it('galat 4xx TIDAK dianggap bisa diulang, tetapi entrinya TIDAK dihapus', async () => {
    apiMock.post.mockRejectedValue(new ApiError('Data tidak sah', 400));
    await enqueue({ method: 'POST', path: '/a', body: {}, label: 'A' });

    const result = await flushQueue();

    expect(result.retryable).toBe(false);
    expect(result.failed).toBe(1);

    // Regresi: sebelumnya entri 4xx dihapus diam-diam sehingga data pengguna hilang.
    const sisa = await listQueue();
    expect(sisa).toHaveLength(1);
    expect(sisa[0].attempts).toBe(1);
    expect(sisa[0].lastError).toBe('Data tidak sah');
  });

  it('galat jaringan (bukan ApiError) dianggap bisa diulang dan entrinya ditahan', async () => {
    apiMock.post.mockRejectedValue(new TypeError('Failed to fetch'));
    await enqueue({ method: 'POST', path: '/a', body: {}, label: 'A' });

    const result = await flushQueue();

    expect(result.retryable).toBe(true);
    expect(await listQueue()).toHaveLength(1);
  });

  it('memakai metode HTTP yang sesuai untuk tiap entri', async () => {
    apiMock.delete.mockResolvedValue(undefined);
    apiMock.put.mockResolvedValue(undefined);
    await enqueue({ method: 'DELETE', path: '/expenses/x1', label: 'Hapus' });
    await enqueue({ method: 'PUT', path: '/events/e1/participants', body: {}, label: 'Peserta' });

    await flushQueue();

    expect(apiMock.delete).toHaveBeenCalledWith('/expenses/x1');
    expect(apiMock.put).toHaveBeenCalledWith('/events/e1/participants', {});
  });

  it('tidak mengirim apa pun bila antrean kosong', async () => {
    const result = await flushQueue();

    expect(result).toEqual({ sent: 0, failed: 0, retryable: true });
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it('mengabaikan panggilan kedua selagi pengiriman masih berjalan', async () => {
    let lepaskan: () => void = () => {};
    apiMock.post.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          lepaskan = () => resolve();
        }),
    );
    await enqueue({ method: 'POST', path: '/a', body: {}, label: 'A' });

    const pertama = flushQueue();
    // Beri kesempatan flushQueue pertama menandai dirinya sedang berjalan.
    await tick();

    const kedua = await flushQueue();
    expect(kedua).toEqual({ sent: 0, failed: 0, retryable: true });
    expect(isSyncing()).toBe(true);

    lepaskan();
    await pertama;

    expect(isSyncing()).toBe(false);
    expect(await listQueue()).toHaveLength(0);
  });
});
