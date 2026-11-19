import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, apiUpload } from '../lib/api';
import {
  cacheCategories,
  cacheEventDetail,
  cacheEvents,
  cacheExpenses,
  enqueue,
  readCachedCategories,
  readCachedEventDetail,
  readCachedEvents,
  readCachedExpenses,
} from '../lib/db';
import { useOnline } from './useOnline';
import type {
  ActivitySummary,
  BudgetItemSummary,
  Category,
  CreateActivityPayload,
  CreateBudgetItemPayload,
  CreateEventPayload,
  CreateExpensePayload,
  EventSummary,
  ExpenseView,
  Participant,
  ReplaceParticipantsPayload,
  ReportSummary,
  SetSharesPayload,
  SharePreviewResponse,
} from '../lib/types';
import { formatCurrency } from '../lib/format';

/** Kunci query terpusat supaya invalidasi tidak salah sasaran. */
export const queryKeys = {
  events: (userId: string) => ['events', userId] as const,
  event: (id: string) => ['event', id] as const,
  /**
   * Awalan semua laporan sebuah Acara. Invalidasi kunci ini menyegarkan
   * Ringkasan, Per Kategori, dan Talangan sekaligus — ketiganya turun dari
   * angka yang sama, jadi tidak boleh ada yang tertinggal.
   */
  eventReport: (eventId: string) => ['report', eventId] as const,
  reportByCategory: (eventId: string) => ['report', eventId, 'by-category'] as const,
  reportTalangan: (eventId: string) => ['report', eventId, 'talangan'] as const,
  activities: (eventId: string) => ['activities', eventId] as const,
  activity: (id: string) => ['activity', id] as const,
  budgetItems: (activityId: string) => ['budget-items', activityId] as const,
  expenses: (activityId: string) => ['expenses', activityId] as const,
  expense: (id: string) => ['expense', id] as const,
  shares: (expenseId: string) => ['shares', expenseId] as const,
  participants: (eventId: string) => ['participants', eventId] as const,
  categories: (userId: string) => ['categories', userId] as const,
};

/**
 * Daftar acara. Saat offline, jatuh ke cache IndexedDB supaya layar tetap
 * terisi (ADR-0002: cache baca + antrean tulis).
 */
export function useEvents(userId: string | undefined) {
  const online = useOnline();

  return useQuery({
    queryKey: queryKeys.events(userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async (): Promise<EventSummary[]> => {
      if (!userId) {
        return [];
      }

      if (!online) {
        return (await readCachedEvents(userId)) ?? [];
      }

      try {
        const events = await api.get<EventSummary[]>('/events');
        await cacheEvents(userId, events);
        return events;
      } catch (error) {
        const cached = await readCachedEvents(userId);
        if (cached) {
          return cached;
        }
        throw error;
      }
    },
  });
}

export function useEvent(eventId: string | undefined) {
  const online = useOnline();

  return useQuery({
    queryKey: queryKeys.event(eventId ?? ''),
    enabled: Boolean(eventId),
    queryFn: async (): Promise<EventSummary> => {
      if (!eventId) {
        throw new Error('ID acara tidak ada');
      }

      if (!online) {
        const cached = await readCachedEventDetail(eventId);
        if (cached) {
          return cached;
        }
        throw new Error('Acara ini belum pernah dibuka, jadi belum tersedia offline.');
      }

      try {
        const event = await api.get<EventSummary>(`/events/${eventId}`);
        await cacheEventDetail(event);
        return event;
      } catch (error) {
        const cached = await readCachedEventDetail(eventId);
        if (cached) {
          return cached;
        }
        throw error;
      }
    },
  });
}

export function useEventReport(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.eventReport(eventId ?? ''),
    enabled: Boolean(eventId),
    queryFn: () => api.get<ReportSummary>(`/events/${eventId}/reports/summary`),
  });
}

export function useActivities(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.activities(eventId ?? ''),
    enabled: Boolean(eventId),
    queryFn: () => api.get<ActivitySummary[]>(`/events/${eventId}/activities`),
  });
}

export function useActivity(activityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.activity(activityId ?? ''),
    enabled: Boolean(activityId),
    queryFn: () => api.get<ActivitySummary>(`/activities/${activityId}`),
  });
}

export function useBudgetItems(activityId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.budgetItems(activityId ?? ''),
    enabled: Boolean(activityId),
    queryFn: () => api.get<BudgetItemSummary[]>(`/activities/${activityId}/budget-items`),
  });
}

export function useParticipants(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.participants(eventId ?? ''),
    enabled: Boolean(eventId),
    queryFn: () => api.get<Participant[]>(`/events/${eventId}/participants`),
  });
}

/**
 * Daftar Pengeluaran dalam satu Kegiatan. Saat offline, jatuh ke cache
 * IndexedDB supaya layar tetap terisi.
 */
export function useExpenses(activityId: string | undefined) {
  const online = useOnline();

  return useQuery({
    queryKey: queryKeys.expenses(activityId ?? ''),
    enabled: Boolean(activityId),
    queryFn: async (): Promise<ExpenseView[]> => {
      if (!activityId) {
        return [];
      }

      if (!online) {
        return (await readCachedExpenses(activityId)) ?? [];
      }

      try {
        const expenses = await api.get<ExpenseView[]>(`/activities/${activityId}/expenses`);
        await cacheExpenses(activityId, expenses);
        return expenses;
      } catch (error) {
        const cached = await readCachedExpenses(activityId);
        if (cached) {
          return cached;
        }
        throw error;
      }
    },
  });
}

export function useShares(expenseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.shares(expenseId ?? ''),
    enabled: Boolean(expenseId),
    queryFn: () => api.get<SharePreviewResponse>(`/expenses/${expenseId}/shares`),
  });
}

export function useExpense(expenseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.expense(expenseId ?? ''),
    enabled: Boolean(expenseId),
    queryFn: () => api.get<ExpenseView>(`/expenses/${expenseId}`),
  });
}

export function useCategories(userId: string | undefined) {
  const online = useOnline();

  return useQuery({
    queryKey: queryKeys.categories(userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async (): Promise<Category[]> => {
      if (!userId) {
        return [];
      }

      if (!online) {
        return (await readCachedCategories(userId)) ?? [];
      }

      try {
        const categories = await api.get<Category[]>('/categories');
        await cacheCategories(userId, categories);
        return categories;
      } catch (error) {
        const cached = await readCachedCategories(userId);
        if (cached) {
          return cached;
        }
        throw error;
      }
    },
  });
}

/* ─── Mutasi ───────────────────────────────────────────────────────────────── */

export function useCreateEvent(userId: string | undefined) {
  const queryClient = useQueryClient();
  const online = useOnline();

  return useMutation({
    mutationFn: async (payload: CreateEventPayload) => {
      if (!online) {
        // Tidak bisa membuat Acara saat offline: server yang menentukan id-nya,
        // dan Acara baru butuh id itu untuk layar berikutnya.
        throw new Error('Membuat acara baru butuh koneksi. Coba lagi saat online.');
      }

      return api.post<EventSummary>('/events', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events(userId ?? '') });
    },
  });
}

export function useUpdateEvent(userId: string | undefined, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<CreateEventPayload>) =>
      api.patch<EventSummary>(`/events/${eventId}`, payload),
    onSuccess: (event) => {
      queryClient.setQueryData(queryKeys.event(eventId), event);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events(userId ?? '') });
    },
  });
}

export function useDeleteEvent(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => api.delete(`/events/${eventId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.events(userId ?? '') });
    },
  });
}

/**
 * Mencatat Pengeluaran. Saat offline, operasinya masuk antrean tulis dan
 * dikirim saat koneksi kembali — inilah alur yang dipakai di lokasi acara.
 */
export function useCreateExpense(activityId: string, eventId?: string) {
  const queryClient = useQueryClient();
  const online = useOnline();

  return useMutation({
    mutationFn: async (payload: CreateExpensePayload) => {
      if (!online) {
        await enqueue({
          method: 'POST',
          path: `/activities/${activityId}/expenses`,
          body: payload,
          label: payload.description,
          amount: formatCurrency(payload.amount),
        });
        return null;
      }

      return api.post<ExpenseView>(`/activities/${activityId}/expenses`, payload);
    },
    onSuccess: () => {
      // Realisasi ikut berubah, jadi ringkasan Kegiatan, Acara, dan Laporan
      // harus disegarkan — bukan hanya daftar pengeluarannya.
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses(activityId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity(activityId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetItems(activityId) });
      if (eventId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.activities(eventId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.eventReport(eventId) });
      }
    },
  });
}

/** Menghapus Pengeluaran — juga lewat antrean bila sedang offline. */
export function useDeleteExpense(activityId: string, eventId?: string) {
  const queryClient = useQueryClient();
  const online = useOnline();

  return useMutation({
    mutationFn: async (expense: { id: string; description: string; amount: string }) => {
      if (!online) {
        await enqueue({
          method: 'DELETE',
          path: `/expenses/${expense.id}`,
          label: expense.description,
          amount: expense.amount,
        });
        return;
      }

      await api.delete(`/expenses/${expense.id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses(activityId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity(activityId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetItems(activityId) });
      if (eventId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.activities(eventId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.eventReport(eventId) });
      }
    },
  });
}

/* ─── Struk ────────────────────────────────────────────────────────────────── */

/**
 * Mengunggah foto struk untuk satu Pengeluaran.
 *
 * Sengaja TIDAK masuk antrean offline: berkas tidak bisa disimpan di IndexedDB
 * dengan aman, dan struk biasanya ditambahkan saat di lokasi acara dengan
 * koneksi tersedia. Bila offline, pengguna diberi tahu untuk mencoba lagi nanti.
 */
export function useUploadReceipt(activityId: string, eventId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, file }: { expenseId: string; file: File }) =>
      apiUpload<{ receiptPath: string; signedUrl: string }>(
        `/expenses/${expenseId}/receipt`,
        file,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses(activityId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity(activityId) });
      if (eventId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.activities(eventId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
      }
    },
  });
}

/**
 * Mengambil URL bertanda tangan foto struk saat diminta.
 *
 * Sengaja tidak di-cache lama: URL-nya berumur pendek, jadi mengambilnya
 * saat tombol "Lihat struk" ditekan lebih aman daripada menyimpannya.
 */
export function useReceiptUrl() {
  return useMutation({
    mutationFn: (expenseId: string) =>
      api.get<{ receiptPath: string; signedUrl: string }>(`/expenses/${expenseId}/receipt`),
  });
}

/* ─── Kegiatan ─────────────────────────────────────────────────────────────── */

export function useCreateActivity(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateActivityPayload) =>
      api.post<ActivitySummary>(`/events/${eventId}/activities`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.activities(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventReport(eventId) });
    },
  });
}

export function useUpdateActivity(activityId: string, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<CreateActivityPayload>) =>
      api.patch<ActivitySummary>(`/activities/${activityId}`, payload),
    onSuccess: (activity) => {
      queryClient.setQueryData(queryKeys.activity(activityId), activity);
      void queryClient.invalidateQueries({ queryKey: queryKeys.activities(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventReport(eventId) });
    },
  });
}

export function useDeleteActivity(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (activityId: string) => api.delete(`/activities/${activityId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.activities(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventReport(eventId) });
    },
  });
}

/* ─── Item Anggaran ────────────────────────────────────────────────────────── */

export function useCreateBudgetItem(activityId: string, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateBudgetItemPayload) =>
      api.post<BudgetItemSummary>(`/activities/${activityId}/budget-items`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetItems(activityId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity(activityId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activities(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventReport(eventId) });
    },
  });
}

export function useUpdateBudgetItem(activityId: string, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<CreateBudgetItemPayload> & { id: string }) =>
      api.patch<BudgetItemSummary>(`/budget-items/${id}`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetItems(activityId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity(activityId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activities(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventReport(eventId) });
    },
  });
}

export function useDeleteBudgetItem(activityId: string, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/budget-items/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.budgetItems(activityId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity(activityId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activities(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventReport(eventId) });
    },
  });
}

/* ─── Peserta ──────────────────────────────────────────────────────────────── */

export function useReplaceParticipants(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReplaceParticipantsPayload) =>
      api.put<Participant[]>(`/events/${eventId}/participants`, payload),
    onSuccess: (participants) => {
      queryClient.setQueryData(queryKeys.participants(eventId), participants);
      void queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventReport(eventId) });
    },
  });
}

/* ─── Kategori ─────────────────────────────────────────────────────────────── */

export function useCreateCategory(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => api.post<Category>('/categories', { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories(userId ?? '') });
    },
  });
}

export function useDeleteCategory(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories(userId ?? '') });
    },
  });
}

/* ─── Bagi Biaya ───────────────────────────────────────────────────────────── */

export function useSetShares(expenseId: string, activityId: string, eventId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SetSharesPayload) =>
      api.put<SharePreviewResponse>(`/expenses/${expenseId}/shares`, payload),
    onSuccess: (preview) => {
      queryClient.setQueryData(queryKeys.shares(expenseId), preview);
      void queryClient.invalidateQueries({ queryKey: queryKeys.expenses(activityId) });
      if (eventId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.eventReport(eventId) });
      }
    },
  });
}
