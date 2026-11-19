import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Kenapa tidak `throw` di sini: berkas ini diimpor berantai oleh
 * `main.tsx → App → AuthContext`, jadi throw di level modul meledak SEBELUM
 * React sempat mount — hasilnya layar putih kosong tanpa pesan di halaman.
 * Lebih baik menandai konfigurasi yang kurang lalu membiarkan `main.tsx`
 * menampilkan pesan yang terbaca.
 */
export const supabaseConfigError: string | null =
  !url || !anonKey
    ? 'VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY belum diisi. ' +
      'Salin web/.env.example menjadi web/.env lalu lengkapi nilainya, ' +
      'kemudian jalankan ulang npm run dev.'
    : null;

/**
 * Klien Supabase untuk sisi klien. Hanya anon key yang dipakai di sini —
 * service role key TIDAK PERNAH boleh masuk ke bundel frontend.
 *
 * Saat konfigurasi kosong, nilai cadangan yang tidak berbahaya dipakai supaya
 * pembuatan klien tidak melempar; UI dijaga oleh `supabaseConfigError`.
 */
export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'anon-key-belum-diisi',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
