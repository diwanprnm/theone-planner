/**
 * Format angka dan tanggal — WAJIB persis seperti design system Stitch.
 *
 *   Mata uang:        "Rp 24.500.000"  (titik ribuan, tanpa desimal)
 *   Ringkas di daftar: "Rp 18,2 jt"
 *   Tanggal:          "12 Okt 2026"
 *   Rentang tanggal:  "12–14 Okt 2026"
 *   Jam:              "08:00"
 */

const BULAN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

const NAMA_BULAN_PANJANG = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

/** Menerima angka, string desimal dari server, atau null. */
function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** "Rp 24.500.000" */
export function formatCurrency(value: number | string | null | undefined): string {
  const amount = Math.round(toNumber(value));
  const sign = amount < 0 ? '-' : '';
  const digits = Math.abs(amount).toString();
  const withSeparator = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${sign}Rp ${withSeparator}`;
}

/** "Rp 18,2 jt" — untuk baris daftar yang sempit. */
export function formatCurrencyCompact(value: number | string | null | undefined): string {
  const amount = toNumber(value);
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${trimTrailingZero(abs / 1_000_000_000)} M`;
  }

  if (abs >= 1_000_000) {
    return `${sign}Rp ${trimTrailingZero(abs / 1_000_000)} jt`;
  }

  if (abs >= 1_000) {
    return `${sign}Rp ${trimTrailingZero(abs / 1_000)} rb`;
  }

  return formatCurrency(amount);
}

function trimTrailingZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '').replace('.', ',');
}

/**
 * Mengurai input pengguna menjadi angka. Menerima "1.500.000", "1500000",
 * dan "83.333,33" (koma sebagai pemisah desimal). "1,5jt" tidak didukung.
 */
export function parseCurrencyInput(raw: string): number {
  // Titik adalah pemisah ribuan; koma adalah pemisah desimal.
  const normalized = raw.replace(/\./g, '').replace(',', '.');
  const cleaned = normalized.replace(/[^\d.]/g, '');

  if (!cleaned) {
    return 0;
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Menampilkan angka untuk diketik ulang: 1500000 → "1.500.000", 83 333,33 → "83.333,33" */
export function formatCurrencyInput(value: number): string {
  if (!value) {
    return '';
  }

  // Pisahkan bagian bulat dan pecahan supaya pemisah ribuan tidak disisipkan
  // ke dalam angka desimal (bagi rata bisa menghasilkan pecahan rupiah).
  const [bulat, pecahan] = value.toString().split('.');
  const denganPemisah = bulat.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return pecahan ? `${denganPemisah},${pecahan}` : denganPemisah;
}

/** Mengubah "12 Okt 2026" / "2026-10-12" menjadi Date. */
function toDate(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }

  // Tanggal polos (YYYY-MM-DD) harus dibaca sebagai waktu lokal, bukan UTC,
  // supaya tidak bergeser satu hari di zona waktu Indonesia.
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (plain) {
    return new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]));
  }

  return new Date(value);
}

/** "12 Okt 2026" */
export function formatDate(value: string | Date): string {
  const date = toDate(value);
  return `${date.getDate()} ${BULAN[date.getMonth()]} ${date.getFullYear()}`;
}

/** "12 Okt" — untuk konteks yang tahunnya sudah jelas. */
export function formatDateShort(value: string | Date): string {
  const date = toDate(value);
  return `${date.getDate()} ${BULAN[date.getMonth()]}`;
}

/** "12–14 Okt 2026", atau satu tanggal bila harinya sama. */
export function formatDateRange(start: string | Date, end: string | Date): string {
  const from = toDate(start);
  const to = toDate(end);

  if (from.getTime() === to.getTime()) {
    return formatDate(from);
  }

  if (from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth()) {
    return `${from.getDate()}–${to.getDate()} ${BULAN[to.getMonth()]} ${to.getFullYear()}`;
  }

  if (from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()} ${BULAN[from.getMonth()]} – ${to.getDate()} ${BULAN[to.getMonth()]} ${to.getFullYear()}`;
  }

  return `${formatDate(from)} – ${formatDate(to)}`;
}

/** "08:00" */
export function formatTime(value: string | Date): string {
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  const date = toDate(value);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${hours}:${minutes}`;
}

/** "12 Okt 2026, 08:00" */
export function formatDateTime(value: string | Date): string {
  const date = toDate(value);
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/** Untuk nilai <input type="date"> — YYYY-MM-DD dalam waktu lokal. */
export function toDateInputValue(value: string | Date): string {
  const date = toDate(value);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/** "2026-10-12" → "12 Oktober 2026", untuk judul panjang. */
export function formatDateLong(value: string | Date): string {
  const date = toDate(value);
  return `${date.getDate()} ${NAMA_BULAN_PANJANG[date.getMonth()]} ${date.getFullYear()}`;
}

/** Persentase terpakai, dijepit di 0–100 untuk lebar bilah. */
export function usagePercent(spent: number | string, budget: number | string): number {
  const budgetValue = toNumber(budget);
  if (budgetValue <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((toNumber(spent) / budgetValue) * 100));
}

/** Nada warna bilah anggaran: hijau <80%, kuning 80–100%, merah >100%. */
export function budgetTone(spent: number | string, budget: number | string): 'ok' | 'warning' | 'danger' {
  const budgetValue = toNumber(budget);
  if (budgetValue <= 0) {
    return 'ok';
  }

  const ratio = toNumber(spent) / budgetValue;
  if (ratio > 1) {
    return 'danger';
  }
  if (ratio >= 0.8) {
    return 'warning';
  }

  return 'ok';
}

export const LABEL_STATUS: Record<string, string> = {
  DRAFT: 'Draft',
  BERJALAN: 'Berjalan',
  SELESAI: 'Selesai',
};

export const LABEL_METODE_PEMBAYARAN: Record<string, string> = {
  TUNAI: 'Tunai',
  TRANSFER_BANK: 'Transfer bank',
  QRIS_EWALLET: 'QRIS/E-wallet',
  KARTU: 'Kartu',
};

export const OPSI_METODE_PEMBAYARAN = [
  { value: 'TUNAI', label: 'Tunai' },
  { value: 'TRANSFER_BANK', label: 'Transfer bank' },
  { value: 'QRIS_EWALLET', label: 'QRIS/E-wallet' },
  { value: 'KARTU', label: 'Kartu' },
] as const;

/** Inisial untuk avatar: "Andi" → "A", "Budi Santoso" → "BS". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
