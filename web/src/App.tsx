import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './auth/AuthContext';
import { useSync } from './hooks/useSync';
import { BerandaPage } from './pages/BerandaPage';
import { BagiBiayaPage } from './pages/BagiBiayaPage';
import { BuatAcaraPage } from './pages/BuatAcaraPage';
import { BuatKegiatanPage } from './pages/BuatKegiatanPage';
import { CatatPengeluaranPage } from './pages/CatatPengeluaranPage';
import { DaftarPage } from './pages/DaftarPage';
import { DetailAcaraPage } from './pages/DetailAcaraPage';
import { DetailKegiatanPage } from './pages/DetailKegiatanPage';
import { KategoriPage } from './pages/KategoriPage';
import { LaporanPage } from './pages/LaporanPage';
import { LupaSandiPage } from './pages/LupaSandiPage';
import { MasukPage } from './pages/MasukPage';
import { PengaturanPage } from './pages/PengaturanPage';
import { PesertaPage } from './pages/PesertaPage';
import { UbahAcaraPage } from './pages/UbahAcaraPage';

/**
 * Gerbang rute: tunggu sesi selesai dibaca dulu supaya layar Masuk tidak
 * berkedip sebelum sesi tersimpan sempat dipulihkan.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-shell centered">
        <span className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/masuk" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function App() {
  // Antrean tulis dijaga di akar aplikasi: begitu koneksi kembali, semua
  // operasi offline dikirim berurutan tanpa bergantung pada layar mana yang
  // sedang dibuka.
  useSync();

  return (
    <Routes>
      <Route path="/masuk" element={<MasukPage />} />
      <Route path="/daftar" element={<DaftarPage />} />
      <Route path="/lupa-sandi" element={<LupaSandiPage />} />

      <Route
        path="/beranda"
        element={
          <RequireAuth>
            <BerandaPage />
          </RequireAuth>
        }
      />

      <Route
        path="/acara/baru"
        element={
          <RequireAuth>
            <BuatAcaraPage />
          </RequireAuth>
        }
      />

      <Route
        path="/acara/:eventId"
        element={
          <RequireAuth>
            <DetailAcaraPage />
          </RequireAuth>
        }
      />

      <Route
        path="/acara/:eventId/ubah"
        element={
          <RequireAuth>
            <UbahAcaraPage />
          </RequireAuth>
        }
      />

      <Route
        path="/acara/:eventId/peserta"
        element={
          <RequireAuth>
            <PesertaPage />
          </RequireAuth>
        }
      />

      <Route
        path="/acara/:eventId/kegiatan/baru"
        element={
          <RequireAuth>
            <BuatKegiatanPage />
          </RequireAuth>
        }
      />

      <Route
        path="/acara/:eventId/pengeluaran/baru"
        element={
          <RequireAuth>
            <CatatPengeluaranPage />
          </RequireAuth>
        }
      />

      <Route
        path="/acara/:eventId/laporan"
        element={
          <RequireAuth>
            <LaporanPage />
          </RequireAuth>
        }
      />

      <Route
        path="/kegiatan/:activityId"
        element={
          <RequireAuth>
            <DetailKegiatanPage />
          </RequireAuth>
        }
      />

      <Route
        path="/kegiatan/:activityId/pengeluaran/baru"
        element={
          <RequireAuth>
            <CatatPengeluaranPage />
          </RequireAuth>
        }
      />

      <Route
        path="/pengeluaran/:expenseId/bagi"
        element={
          <RequireAuth>
            <BagiBiayaPage />
          </RequireAuth>
        }
      />

      <Route
        path="/kategori"
        element={
          <RequireAuth>
            <KategoriPage />
          </RequireAuth>
        }
      />

      <Route
        path="/pengaturan"
        element={
          <RequireAuth>
            <PengaturanPage />
          </RequireAuth>
        }
      />

      <Route
        path="/laporan"
        element={
          <RequireAuth>
            <LaporanPage />
          </RequireAuth>
        }
      />

      <Route path="/" element={<Navigate to="/beranda" replace />} />
      <Route path="*" element={<Navigate to="/beranda" replace />} />
    </Routes>
  );
}
