import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../components/AppBar';
import { BottomNav } from '../components/BottomNav';
import { IconAlert, IconCheck, IconCloudOff, IconReceipt } from '../components/Icons';
import { useTheme } from '../hooks/useTheme';
import { useSync } from '../hooks/useSync';
import { db } from '../lib/db';
import { initials } from '../lib/format';

/**
 * Pengaturan (Prompt 14). Termasuk lembar "Antrean sinkron" (Prompt 15) yang
 * memperlihatkan operasi tulis yang belum terkirim.
 */
export function PengaturanPage() {
  const { user, signOut, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme, gelap, toggleGelap } = useTheme();
  const { pending, syncing, error, flush } = useSync();

  const [queueOpen, setQueueOpen] = useState(false);
  const [confirmKeluar, setConfirmKeluar] = useState(false);
  const [confirmHapus, setConfirmHapus] = useState(false);
  const [hapusError, setHapusError] = useState<string | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const nama = user?.user_metadata?.full_name ?? user?.email ?? 'Pengguna';
  const penyediaGoogle = user?.app_metadata?.providers?.includes('google');

  async function keluar() {
    await signOut();
    navigate('/masuk', { replace: true });
  }

  async function hapusAkun() {
    setHapusError(null);
    setMenghapus(true);

    try {
      await deleteAccount();
      navigate('/masuk', { replace: true });
    } catch (caught) {
      setHapusError(caught instanceof Error ? caught.message : 'Gagal menghapus akun.');
      setMenghapus(false);
    }
  }

  return (
    <div className="app-shell">
      <AppBar title="Pengaturan" titleLeft />

      <div className="screen">
        <section className="card">
          <div className="row" style={{ justifyContent: 'flex-start', gap: 'var(--space-4)' }}>
            <span className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>
              {initials(nama)}
            </span>
            <span className="stack stack--tight" style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{nama}</span>
              <span className="caption">{user?.email}</span>
              {penyediaGoogle ? (
                <span className="chip chip--muted" style={{ alignSelf: 'flex-start' }}>
                  Masuk dengan Google
                </span>
              ) : null}
            </span>
          </div>
        </section>

        <section className="section">
          <h2 className="section__title" style={{ marginBottom: 'var(--space-3)' }}>
            Umum
          </h2>

          <div className="list__card" style={{ padding: 0 }}>
            <div className="settings-row settings-row--static">
              <span className="settings-row__label">Mata uang</span>
              <span className="settings-row__value">Rupiah (Rp)</span>
            </div>

            <div className="settings-row settings-row--static">
              <span className="settings-row__label">Bahasa</span>
              <span className="settings-row__value">Bahasa Indonesia</span>
            </div>

            <label className="settings-row" style={{ cursor: 'pointer' }}>
              <span className="settings-row__label">Mode gelap</span>
              <span className="switch">
                <input
                  type="checkbox"
                  checked={gelap}
                  onChange={(event) => toggleGelap(event.target.checked)}
                  aria-label="Mode gelap"
                />
                <span className="switch__track" />
              </span>
            </label>

            <button type="button" className="settings-row" onClick={() => navigate('/kategori')}>
              <span className="settings-row__label">Kategori</span>
              <span className="settings-row__value">Kelola</span>
            </button>
          </div>

          {theme !== 'system' ? (
            <button
              type="button"
              className="section__link"
              style={{ marginTop: 'var(--space-2)' }}
              onClick={() => setTheme('system')}
            >
              Ikuti pengaturan perangkat
            </button>
          ) : (
            <p className="caption" style={{ marginTop: 'var(--space-2)' }}>
              Tampilan mengikuti pengaturan perangkat.
            </p>
          )}
        </section>

        <section className="section">
          <h2 className="section__title" style={{ marginBottom: 'var(--space-3)' }}>
            Sinkronisasi
          </h2>

          <div className="list__card" style={{ padding: 0 }}>
            <button type="button" className="settings-row" onClick={() => setQueueOpen(true)}>
              <span className="settings-row__label">Status sinkron</span>
              {pending === 0 ? (
                <span className="sync-pill sync-pill--ok">
                  <IconCheck size={14} />
                  Tersinkron
                </span>
              ) : (
                <span className="sync-pill sync-pill--pending">
                  <IconCloudOff size={14} />
                  {syncing ? 'Mengirim…' : `${pending} menunggu`}
                </span>
              )}
            </button>
          </div>

          {error ? (
            <div className="alert alert--danger" role="alert" style={{ marginTop: 'var(--space-3)' }}>
              <IconAlert size={16} />
              <span>{error}</span>
            </div>
          ) : null}
        </section>

        <section className="section">
          <h2 className="section__title" style={{ marginBottom: 'var(--space-3)' }}>
            Akun
          </h2>

          <div className="list__card" style={{ padding: 0 }}>
            <button type="button" className="settings-row" onClick={() => setConfirmKeluar(true)}>
              <span className="settings-row__label">Keluar</span>
            </button>

            <button
              type="button"
              className="settings-row settings-row--danger"
              onClick={() => {
                setHapusError(null);
                setConfirmHapus(true);
              }}
            >
              <span className="settings-row__label">Hapus akun</span>
              <IconAlert size={18} />
            </button>
          </div>
        </section>

        <p className="muted-note">
          Data kamu privat dan tidak dibagikan ke siapa pun. Semua acara hanya bisa dilihat oleh
          akun ini.
        </p>
      </div>

      {queueOpen ? <AntreanSheet onClose={() => setQueueOpen(false)} onFlush={flush} syncing={syncing} /> : null}

      {confirmKeluar ? (
        <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="keluar-judul">
          <div className="dialog__panel">
            <h2 id="keluar-judul" className="sheet__title">
              Keluar dari akun?
            </h2>
            <p className="caption">
              Data yang belum terkirim akan hilang bila kamu keluar sekarang.
              {pending > 0 ? ` Ada ${pending} operasi yang masih menunggu.` : ''}
            </p>

            <div className="dialog__actions">
              <button
                type="button"
                className="button button--outlined"
                onClick={() => setConfirmKeluar(false)}
              >
                Batal
              </button>
              <button type="button" className="button button--danger" onClick={() => void keluar()}>
                Keluar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmHapus ? (
        <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="hapus-judul">
          <div className="dialog__panel">
            <h2 id="hapus-judul" className="sheet__title">
              Hapus akun?
            </h2>
            <p className="caption">
              Semua acara, kegiatan, pengeluaran, dan foto akan dihapus permanen. Tindakan ini
              tidak bisa dibatalkan.
              {pending > 0 ? ` Ada ${pending} operasi yang belum terkirim dan akan ikut hilang.` : ''}
            </p>

            {hapusError ? (
              <div className="alert alert--danger" role="alert" style={{ marginTop: 'var(--space-3)' }}>
                <IconAlert size={16} />
                <span>{hapusError}</span>
              </div>
            ) : null}

            <div className="dialog__actions">
              <button
                type="button"
                className="button button--outlined"
                disabled={menghapus}
                onClick={() => setConfirmHapus(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="button button--danger"
                disabled={menghapus}
                onClick={() => void hapusAkun()}
              >
                {menghapus ? <span className="spinner" /> : 'Hapus permanen'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}

/** Lembar antrean sinkron — memperlihatkan tiap operasi yang belum terkirim. */
function AntreanSheet({
  onClose,
  onFlush,
  syncing,
}: {
  onClose: () => void;
  onFlush: () => Promise<void>;
  syncing: boolean;
}) {
  const entries = useLiveQuery(() => db.outbox.orderBy('createdAt').toArray(), [], []);

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__panel" onClick={(event) => event.stopPropagation()}>
        <div className="sheet__grip" />
        <h2 className="sheet__title">Antrean sinkron</h2>

        {entries.length === 0 ? (
          <div className="centered" style={{ minHeight: 'auto', padding: 'var(--space-6) 0' }}>
            <span style={{ color: 'var(--color-success)' }}>
              <IconCheck size={40} />
            </span>
            <p style={{ fontWeight: 600 }}>Semua tersinkron</p>
            <p className="caption caption--muted">Tidak ada yang menunggu dikirim.</p>
          </div>
        ) : (
          <>
            <p className="caption" style={{ marginBottom: 'var(--space-3)' }}>
              {entries.length} operasi menunggu dikirim
            </p>

            <div className="list__card" style={{ marginBottom: 'var(--space-4)' }}>
              {entries.map((entry) => (
                <div key={entry.id} className="list__row">
                  <span className="list__body">
                    <span className="list__title">{entry.label}</span>
                    <span className="list__subtitle">
                      {entry.method === 'DELETE' ? 'Hapus' : 'Simpan'}
                      {entry.attempts > 0 ? ` · ${entry.attempts}× gagal dicoba` : ''}
                    </span>
                    {entry.lastError ? (
                      <span className="list__subtitle" style={{ color: 'var(--color-danger)' }}>
                        {entry.lastError}
                      </span>
                    ) : null}
                  </span>
                  {entry.amount ? (
                    <span className="list__trailing tabular">{entry.amount}</span>
                  ) : (
                    <IconReceipt size={18} />
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="button button--primary"
              disabled={syncing}
              onClick={() => void onFlush()}
            >
              {syncing ? <span className="spinner" /> : 'Sinkron sekarang'}
            </button>
          </>
        )}

        <p className="caption caption--muted" style={{ marginTop: 'var(--space-4)' }}>
          Antrean dikirim berurutan. Bila satu operasi gagal, sisanya menunggu sampai operasi itu
          berhasil.
        </p>
      </div>
    </div>
  );
}
