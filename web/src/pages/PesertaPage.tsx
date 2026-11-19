import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { IconAlert, IconPlus, IconTrash } from '../components/Icons';
import { useParticipants, useReplaceParticipants } from '../hooks/useApi';
import { initials } from '../lib/format';

/**
 * Kelola Peserta (Prompt 6). Peserta hanya nama — mereka tidak perlu punya
 * akun. Daftar disimpan sekaligus lewat PUT /participants.
 *
 * Baris baru memakai id sementara di klien; server membuat id asli bila yang
 * dikirim belum ada (upsert by id).
 */
interface Row {
  id: string;
  name: string;
}

function idSementara(): string {
  return crypto.randomUUID();
}

export function PesertaPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: participants, isLoading } = useParticipants(eventId);
  const replaceAll = useReplaceParticipants(eventId ?? '');

  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (participants) {
      setRows(participants.map((participant) => ({ id: participant.id, name: participant.name })));
    }
  }, [participants]);

  function tambah() {
    setError(null);
    const name = draft.trim();

    if (!name) {
      return;
    }

    if (rows.some((row) => row.name.toLowerCase() === name.toLowerCase())) {
      setError('Nama peserta itu sudah ada di acara ini.');
      return;
    }

    setRows((current) => [...current, { id: idSementara(), name }]);
    setDraft('');
  }

  function ubahNama(id: string, name: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, name } : row)));
  }

  function hapus(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function simpan() {
    setError(null);

    const bersih = rows
      .map((row) => ({ id: row.id, name: row.name.trim() }))
      .filter((row) => row.name.length > 0);

    const nama = bersih.map((row) => row.name.toLowerCase());
    if (new Set(nama).size !== nama.length) {
      setError('Ada nama peserta yang sama. Nama harus unik di satu acara.');
      return;
    }

    try {
      await replaceAll.mutateAsync({ participants: bersih });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan peserta.');
    }
  }

  return (
    <div className="app-shell">
      <AppBar
        title="Peserta"
        back
        backTo={eventId ? `/acara/${eventId}` : undefined}
        action={{
          label: replaceAll.isPending ? '…' : 'Simpan',
          onClick: () => void simpan(),
          disabled: replaceAll.isPending,
        }}
      />

      <div className="screen screen--no-nav">
        <p className="caption" style={{ marginBottom: 'var(--space-4)' }}>
          Tambahkan nama orang yang ikut acara. Mereka tidak perlu punya akun.
        </p>

        {error ? (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            <IconAlert size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="row" style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <input
            className="field__input"
            style={{ flex: 1 }}
            placeholder="Nama peserta"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                tambah();
              }
            }}
          />
          <button type="button" className="button button--primary button--auto" onClick={tambah}>
            <IconPlus size={18} />
            Tambah
          </button>
        </div>

        {isLoading ? (
          <p className="caption">Memuat peserta…</p>
        ) : rows.length === 0 ? (
          <p className="caption">Belum ada peserta. Tambahkan nama pertama di atas.</p>
        ) : (
          <div className="list__card">
            {rows.map((row) => (
              <div key={row.id} className="list__row">
                <span className="avatar avatar--sm">{initials(row.name) || '?'}</span>
                <input
                  className="field__input"
                  style={{ flex: 1, border: 'none', background: 'transparent', padding: 0 }}
                  value={row.name}
                  onChange={(event) => ubahNama(row.id, event.target.value)}
                  aria-label={`Nama peserta ${row.name}`}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Hapus ${row.name}`}
                  onClick={() => hapus(row.id)}
                >
                  <IconTrash size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="caption" style={{ marginTop: 'var(--space-3)' }}>
          {rows.length} peserta
        </p>

        <p className="muted-note">
          Menghapus peserta juga menghapus bagian biayanya. Pengeluaran yang ia talangi tetap
          tercatat, hanya tanpa nama pembayar.
        </p>

        <button
          type="button"
          className="button button--primary"
          disabled={replaceAll.isPending}
          onClick={() => void simpan()}
          style={{ marginTop: 'var(--space-4)' }}
        >
          {replaceAll.isPending ? <span className="spinner" /> : 'Simpan peserta'}
        </button>
      </div>
    </div>
  );
}
