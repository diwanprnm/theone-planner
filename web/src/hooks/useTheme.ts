import { useEffect, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'event-ledger:theme';

function bacaTema(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark') {
      return value;
    }
  } catch {
    // localStorage bisa diblokir di jendela privat — abaikan dan pakai default.
  }

  return 'system';
}

/**
 * Mode gelap. Pilihannya per-perangkat saja (localStorage), karena ini
 * preferensi tampilan, bukan data keuangan.
 *
 * "system" mengikuti preferensi OS lewat media query di tokens.css; pilihan
 * eksplisit dipasang sebagai data-theme pada <html>.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(bacaTema);

  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }

    try {
      if (theme === 'system') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, theme);
      }
    } catch {
      // Penyimpanan gagal bukan alasan untuk menggagalkan perubahan tema.
    }
  }, [theme]);

  /** Sakelar dua arah: nyala berarti gelap, mati berarti terang. */
  const gelap = theme === 'dark';
  function toggleGelap(next: boolean) {
    setTheme(next ? 'dark' : 'light');
  }

  return { theme, setTheme, gelap, toggleGelap };
}
