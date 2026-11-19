import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { supabaseConfigError } from './lib/supabase';
import './styles/tokens.css';
import './styles/global.css';

/**
 * Satu QueryClient untuk seluruh aplikasi.
 *
 * `refetchOnWindowFocus` dimatikan: saat dipakai di lokasi acara, pengguna
 * berpindah-pindah aplikasi (kamera, chat) dan refetch otomatis di tengah
 * pengisian form hanya membuat angka berkedip tanpa manfaat.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const container = document.getElementById('root');

if (!container) {
  throw new Error('Elemen #root tidak ditemukan di index.html');
}

/**
 * Bila kunci Supabase belum diisi, tampilkan pesan yang terbaca di halaman —
 * bukan layar putih kosong. Kegagalan konfigurasi bukan kesalahan pengguna,
 * jadi penjelasannya harus langsung terlihat tanpa membuka Console.
 */
if (supabaseConfigError) {
  createRoot(container).render(
    <StrictMode>
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '48px 24px',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: '#0F172A',
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
          Konfigurasi belum lengkap
        </h1>
        <p style={{ lineHeight: 1.6, color: '#64748B', marginBottom: 16 }}>
          {supabaseConfigError}
        </p>
        <pre
          style={{
            background: '#F1F5F9',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: 16,
            fontSize: 13,
            lineHeight: 1.7,
            overflowX: 'auto',
          }}
        >
{`VITE_API_BASE_URL="/api"
VITE_SUPABASE_URL="https://<ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<anon-key>"`}
        </pre>
        <p style={{ lineHeight: 1.6, color: '#94A3B8', fontSize: 13, marginTop: 16 }}>
          Hanya anon key yang boleh ditaruh di sini. Service role key tidak pernah masuk ke
          frontend.
        </p>
      </div>
    </StrictMode>,
  );
} else {
  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
