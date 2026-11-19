import { describe, expect, it } from 'vitest';
import {
  budgetTone,
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyInput,
  formatDate,
  formatDateLong,
  formatDateRange,
  formatDateShort,
  formatDateTime,
  formatTime,
  initials,
  parseCurrencyInput,
  toDateInputValue,
  usagePercent,
} from './format';

describe('formatCurrency', () => {
  it('memakai titik sebagai pemisah ribuan dan tanpa desimal', () => {
    expect(formatCurrency(24_500_000)).toBe('Rp 24.500.000');
    expect(formatCurrency('1500')).toBe('Rp 1.500');
  });

  it('membulatkan angka desimal', () => {
    expect(formatCurrency(1500.4)).toBe('Rp 1.500');
    expect(formatCurrency(1500.6)).toBe('Rp 1.501');
  });

  it('menangani nol, null, dan nilai tak sah', () => {
    expect(formatCurrency(0)).toBe('Rp 0');
    expect(formatCurrency(null)).toBe('Rp 0');
    expect(formatCurrency(undefined)).toBe('Rp 0');
    expect(formatCurrency('bukan angka')).toBe('Rp 0');
  });

  it('menaruh tanda minus di depan "Rp"', () => {
    expect(formatCurrency(-2500)).toBe('-Rp 2.500');
  });
});

describe('formatCurrencyCompact', () => {
  it('meringkas miliar, juta, dan ribu', () => {
    expect(formatCurrencyCompact(1_500_000_000)).toBe('Rp 1,5 M');
    expect(formatCurrencyCompact(18_200_000)).toBe('Rp 18,2 jt');
    expect(formatCurrencyCompact(25_000)).toBe('Rp 25 rb');
  });

  it('membuang desimal nol', () => {
    expect(formatCurrencyCompact(2_000_000)).toBe('Rp 2 jt');
  });

  it('jatuh ke format penuh untuk nilai kecil', () => {
    expect(formatCurrencyCompact(750)).toBe('Rp 750');
  });

  it('mempertahankan tanda minus', () => {
    expect(formatCurrencyCompact(-2_000_000)).toBe('-Rp 2 jt');
  });
});

describe('parseCurrencyInput', () => {
  it('mengabaikan titik sebagai pemisah ribuan', () => {
    expect(parseCurrencyInput('1.500.000')).toBe(1_500_000);
  });

  it('membaca koma sebagai pemisah desimal', () => {
    expect(parseCurrencyInput('83.333,33')).toBeCloseTo(83_333.33, 2);
  });

  it('mengembalikan 0 untuk masukan kosong atau sampah', () => {
    expect(parseCurrencyInput('')).toBe(0);
    expect(parseCurrencyInput('abc')).toBe(0);
  });
});

describe('formatCurrencyInput', () => {
  it('menyisipkan pemisah ribuan tanpa mengganggu pecahan', () => {
    expect(formatCurrencyInput(1_500_000)).toBe('1.500.000');
    expect(formatCurrencyInput(83_333.33)).toBe('83.333,33');
  });

  it('mengembalikan string kosong untuk nol', () => {
    expect(formatCurrencyInput(0)).toBe('');
  });
});

describe('formatDate', () => {
  it('memakai nama bulan Indonesia', () => {
    expect(formatDate('2026-10-12')).toBe('12 Okt 2026');
  });

  it('membaca tanggal polos sebagai waktu lokal (tidak bergeser)', () => {
    // Bila dibaca sebagai UTC, zona Indonesia (UTC+7) bisa menggeser ke hari lain.
    expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
  });

  it('formatDateShort hanya tanggal dan bulan', () => {
    expect(formatDateShort('2026-10-12')).toBe('12 Okt');
  });

  it('formatDateLong memakai nama bulan penuh', () => {
    expect(formatDateLong('2026-10-12')).toBe('12 Oktober 2026');
  });
});

describe('formatDateRange', () => {
  it('satu tanggal bila harinya sama', () => {
    expect(formatDateRange('2026-10-12', '2026-10-12')).toBe('12 Okt 2026');
  });

  it('menggabungkan hari pada bulan & tahun yang sama', () => {
    expect(formatDateRange('2026-10-12', '2026-10-14')).toBe('12–14 Okt 2026');
  });

  it('menyebut dua bulan pada tahun yang sama', () => {
    expect(formatDateRange('2026-10-30', '2026-11-02')).toBe('30 Okt – 2 Nov 2026');
  });

  it('menyebut dua tahun penuh bila berbeda', () => {
    expect(formatDateRange('2026-12-30', '2027-01-02')).toBe('30 Des 2026 – 2 Jan 2027');
  });
});

describe('formatTime', () => {
  it('mengembalikan string jam apa adanya', () => {
    expect(formatTime('08:00')).toBe('08:00');
  });

  it('memformat dari Date', () => {
    const date = new Date(2026, 9, 12, 8, 5);
    expect(formatTime(date)).toBe('08:05');
  });
});

describe('formatDateTime', () => {
  it('menggabungkan tanggal dan jam', () => {
    expect(formatDateTime(new Date(2026, 9, 12, 8, 0))).toBe('12 Okt 2026, 08:00');
  });
});

describe('toDateInputValue', () => {
  it('menghasilkan YYYY-MM-DD waktu lokal', () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('usagePercent', () => {
  it('membulatkan persentase terpakai', () => {
    expect(usagePercent(500, 1000)).toBe(50);
    expect(usagePercent(250, 1000)).toBe(25);
  });

  it('dijepit di 100 walau pengeluaran melebihi anggaran', () => {
    expect(usagePercent(2500, 1000)).toBe(100);
  });

  it('mengembalikan 0 bila anggaran nol', () => {
    expect(usagePercent(500, 0)).toBe(0);
  });
});

describe('budgetTone', () => {
  it('hijau di bawah 80%', () => {
    expect(budgetTone(790, 1000)).toBe('ok');
  });

  it('kuning di 80–100%', () => {
    expect(budgetTone(800, 1000)).toBe('warning');
    expect(budgetTone(1000, 1000)).toBe('warning');
  });

  it('merah bila melebihi anggaran', () => {
    expect(budgetTone(1001, 1000)).toBe('danger');
  });

  it('hijau bila anggaran nol', () => {
    expect(budgetTone(500, 0)).toBe('ok');
  });
});

describe('initials', () => {
  it('mengambil satu huruf untuk nama tunggal', () => {
    expect(initials('Andi')).toBe('A');
  });

  it('mengambil dua huruf untuk dua kata atau lebih', () => {
    expect(initials('Budi Santoso')).toBe('BS');
    expect(initials('Ani Budi Citra')).toBe('AB');
  });

  it('mengembalikan string kosong untuk nama kosong', () => {
    expect(initials('   ')).toBe('');
  });
});
