/** Tipe yang mencerminkan respons API NestJS. */

export type EventStatus = 'DRAFT' | 'BERJALAN' | 'SELESAI';

export type PaymentMethod = 'TUNAI' | 'TRANSFER_BANK' | 'QRIS_EWALLET' | 'KARTU';

/** Anggaran dan realisasi selalu datang sebagai string desimal dari server. */
export type Decimal = string;

export interface EventSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
  fundsRaised: Decimal | null;
  budgetTotal: Decimal;
  realizedTotal: Decimal;
  remaining: Decimal;
  participantCount: number;
}

export interface ActivitySummary {
  id: string;
  eventId: string;
  name: string;
  sortOrder: number;
  date: string;
  time: string | null;
  location: string | null;
  notes: string | null;
  budgetTotal: Decimal;
  realizedTotal: Decimal;
  remaining: Decimal;
}

export interface BudgetItemSummary {
  id: string;
  activityId: string;
  categoryId: string | null;
  name: string;
  amount: Decimal;
  realizedTotal: Decimal;
  remaining: Decimal;
  expenseCount: number;
}

export interface Participant {
  id: string;
  eventId: string;
  name: string;
}

export interface ExpenseShareView {
  participantId: string;
  participantName: string;
  amount: Decimal;
}

export interface ExpenseView {
  id: string;
  activityId: string;
  budgetItemId: string | null;
  categoryId: string | null;
  payerId: string | null;
  payerName: string | null;
  amount: Decimal;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  receiptPath: string | null;
  shares: ExpenseShareView[];
}

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
  userId: string | null;
}

export interface ReportSummary {
  eventId: string;
  budgetTotal: Decimal;
  realizedTotal: Decimal;
  remaining: Decimal;
  fundsRaised: Decimal | null;
  surplus: Decimal | null;
  perActivity: {
    activityId: string;
    name: string;
    budgetTotal: Decimal;
    realizedTotal: Decimal;
    delta: Decimal;
  }[];
}

export interface CategoryBreakdownRow {
  categoryId: string | null;
  categoryName: string;
  total: Decimal;
  expenseCount: number;
}

export interface TalanganRow {
  participantId: string;
  participantName: string;
  total: Decimal;
}

export interface SharePreview {
  participantId: string;
  participantName: string;
  amount: Decimal;
  included: boolean;
}

export interface SharePreviewResponse {
  expenseId: string;
  total: Decimal;
  assigned: Decimal;
  unassigned: Decimal;
  shares: SharePreview[];
}

/* ─── Muatan permintaan ────────────────────────────────────────────────────── */

export interface CreateEventPayload {
  name: string;
  startDate: string;
  endDate: string;
  status?: EventStatus;
  fundsRaised?: number;
}

export interface CreateActivityPayload {
  name: string;
  date: string;
  time?: string;
  location?: string;
  notes?: string;
}

export interface CreateExpensePayload {
  amount: number;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  budgetItemId?: string;
  categoryId?: string;
  payerId?: string;
  receiptPath?: string;
  shares?: { participantId: string; amount: number }[];
}

export interface CreateBudgetItemPayload {
  name: string;
  amount: number;
  categoryId?: string;
}

/** Mengganti seluruh daftar Peserta sekaligus — dipakai layar "Kelola Peserta". */
export interface ReplaceParticipantsPayload {
  participants: { id: string; name: string }[];
}

export interface CreateCategoryPayload {
  name: string;
}

export interface SetSharesPayload {
  shares: { participantId: string; amount: number }[];
}
