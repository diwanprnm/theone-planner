import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { IconAlert, IconCheck, IconInfo } from '../components/Icons';
import { useActivity, useExpense, useSetShares, useShares } from '../hooks/useApi';
import {
  formatCurrency,
  formatCurrencyInput,
  initials,
  parseCurrencyInput,
} from '../lib/format';

interface Row {
  participantId: string;
  name: string;
  included: boolean;
  amount: number;
  /** True bila pengguna pernah mengetik jumlahnya sendiri — untuk tag "Disesuaikan". */
  edited: boolean;
}

/** Membulatkan ke 2 desimal untuk menghindari galat pecahan rupiah. */
function bulatkan(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Membagi rata seperti server: sisa pembulatan ditimpakan ke peserta pertama
 * supaya jumlahnya tetap persis sama dengan total.
 */
function bagiRata(total: number, rows: Row[]): Row[] {
  if (rows.length === 0) {
    return rows;
  }

  const base = bulatkan(Math.floor((total / rows.length) * 100) / 100);
  const remainder = bulatkan(total - base * rows.length);

  return rows.map((row, index) => ({
    ...row,
    included: true,
    amount: index === 0 ? bulatkan(base + remainder) : base,
    edited: false,
  }));
}

/**
 * Bagi Biaya (Prompt 11) — editor pembagian satu Pengeluaran.
 *
 * Aturan domain: aplikasi hanya membagi biaya ke Peserta, tidak menghitung
 * utang bersih antar orang. Tombol simpan tertahan sampai sisa belum terbagi
 * nol, karena server menolak pembagian yang jumlahnya tidak sama dengan
 * nominal pengeluaran.
 */
export function BagiBiayaPage() {
  const { expenseId } = useParams<{ expenseId: string }>();
  const navigate = useNavigate();

  const { data: expense } = useExpense(expenseId);
  const { data: activity } = useActivity(expense?.activityId);
  const { data: preview, isLoading, error } = useShares(expenseId);
  const setShares = useSetShares(expenseId ?? '', expense?.activityId ?? '', activity?.eventId);

  const [rows, setRows] = useState<Row[]>([]);
  const [bagiRataAktif, setBagiRataAktif] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const total = Number(preview?.total ?? 0);

  // Isi baris dari pembagian yang tersimpan; kalau belum pernah dibagi,
  // mulai dari bagi rata.
  useEffect(() => {
    if (!preview) {
      return;
    }

    const tersimpan = preview.shares.map((share) => ({
      participantId: share.participantId,
      name: share.participantName,
      included: share.included,
      amount: Number(share.amount),
      edited: false,
    }));

    const adaTersimpan = tersimpan.some((row) => row.included);
    if (adaTersimpan) {
      setRows(tersimpan);
      setBagiRataAktif(false);
      return;
    }

    setRows(bagiRata(Number(preview.total), tersimpan));
    setBagiRataAktif(true);
  }, [preview]);

  const terbagi = useMemo(
    () => bulatkan(rows.filter((row) => row.included).reduce((sum, row) => sum + row.amount, 0)),
    [rows],
  );
  const sisa = bulatkan(total - terbagi);
  const seimbang = Math.abs(sisa) < 0.005;

  function ubahIkut(participantId: string, included: boolean) {
    setBagiRataAktif(false);
    setRows((current) =>
      current.map((row) =>
        row.participantId === participantId
          ? { ...row, included, amount: included ? row.amount : 0, edited: false }
          : row,
      ),
    );
  }

  function ubahJumlah(participantId: string, amount: number) {
    setBagiRataAktif(false);
    setRows((current) =>
      current.map((row) =>
        row.participantId === participantId ? { ...row, amount, included: true, edited: true } : row,
      ),
    );
  }

  function aktifkanBagiRata() {
    setBagiRataAktif(true);
    setRows((current) => bagiRata(total, current));
  }

  async function simpan() {
    setFormError(null);

    if (!seimbang) {
      setFormError('Sisa belum terbagi harus Rp 0 sebelum menyimpan.');
      return;
    }

    const shares = rows
      .filter((row) => row.included)
      .map((row) => ({ participantId: row.participantId, amount: row.amount }));

    try {
      await setShares.mutateAsync({ shares });
      navigate(-1);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Gagal menyimpan pembagian.');
    }
  }

  if (isLoading) {
    return (
      <div className="app-shell">
        <AppBar title="Bagi Biaya" back />
        <p className="screen caption">Memuat pembagian…</p>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="app-shell">
        <AppBar title="Bagi Biaya" back />
        <div className="screen">
          <div className="alert alert--danger" role="alert">
            {error instanceof Error ? error.message : 'Pembagian tidak ditemukan.'}
          </div>
        </div>
      </div>
    );
  }

  const jumlahIkut = rows.filter((row) => row.included).length;
  const rataPerOrang = jumlahIkut > 0 ? bulatkan(total / jumlahIkut) : 0;

  return (
    <div className="app-shell">
      <AppBar
        title="Bagi Biaya"
        back
        action={{
          label: setShares.isPending ? '…' : 'Simpan',
          onClick: () => void simpan(),
          disabled: setShares.isPending || !seimbang,
        }}
      />

      <div className="screen screen--no-nav">
        <section className="card card--tinted">
          <p className="caption">Total pengeluaran</p>
          <p className="tabular" style={{ fontSize: 26, fontWeight: 700, marginTop: 'var(--space-1)' }}>
            {formatCurrency(total)}
          </p>

          <label
            className="row"
            style={{ marginTop: 'var(--space-4)', cursor: 'pointer', justifyContent: 'space-between' }}
          >
            <span style={{ fontWeight: 600 }}>Bagi rata</span>
            <span className="switch">
              <input
                type="checkbox"
                checked={bagiRataAktif}
                onChange={(event) => (event.target.checked ? aktifkanBagiRata() : setBagiRataAktif(false))}
                aria-label="Bagi rata"
              />
              <span className="switch__track" />
            </span>
          </label>
          <p className="caption" style={{ marginTop: 'var(--space-2)' }}>
            {jumlahIkut} peserta · sekitar {formatCurrency(rataPerOrang)} / orang
          </p>
        </section>

        {formError ? (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            <IconAlert size={16} />
            <span>{formError}</span>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <p className="caption">
            Belum ada peserta di acara ini. Tambahkan peserta dulu untuk membagi biaya.
          </p>
        ) : (
          <div className="list__card">
            {rows.map((row) => {
              const disesuaikan = row.included && row.edited && !bagiRataAktif;

              return (
                <div
                  key={row.participantId}
                  className="list__row"
                  style={{ opacity: row.included ? 1 : 0.5 }}
                >
                  <input
                    type="checkbox"
                    checked={row.included}
                    onChange={(event) => ubahIkut(row.participantId, event.target.checked)}
                    aria-label={`Ikut menanggung ${row.name}`}
                    style={{ width: 20, height: 20, accentColor: 'var(--color-primary)' }}
                  />
                  <span className="avatar avatar--sm">{initials(row.name) || '?'}</span>
                  <span className="list__body">
                    <span className="list__title">{row.name}</span>
                    {disesuaikan ? (
                      <span className="chip chip--warning" style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                        Disesuaikan
                      </span>
                    ) : null}
                  </span>

                  {row.included ? (
                    <span className="amount-field" style={{ maxWidth: 150 }}>
                      <span className="amount-field__prefix">Rp</span>
                      <input
                        className="amount-field__input"
                        inputMode="numeric"
                        value={formatCurrencyInput(row.amount)}
                        onChange={(event) =>
                          ubahJumlah(row.participantId, parseCurrencyInput(event.target.value))
                        }
                        aria-label={`Bagian ${row.name}`}
                        style={{ textAlign: 'right' }}
                      />
                    </span>
                  ) : (
                    <span className="list__trailing">—</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="muted-note">
          Aplikasi hanya membagi biaya ke peserta, tidak menghitung utang bersih antar orang.
          Penggantian dilakukan manual.
        </p>
      </div>

      {/* Bilah sisa belum terbagi — menahan simpan sampai angkanya nol. */}
      <div className="sticky-actions">
        <div className="row" style={{ marginBottom: 'var(--space-3)' }}>
          <span className="caption">Sisa belum terbagi</span>
          {seimbang ? (
            <span className="row" style={{ gap: 'var(--space-1)', color: 'var(--color-success)' }}>
              <IconCheck size={16} />
              <span className="tabular" style={{ fontWeight: 600 }}>
                {formatCurrency(0)}
              </span>
            </span>
          ) : (
            <span className="row" style={{ gap: 'var(--space-1)', color: 'var(--color-danger)' }}>
              <IconAlert size={16} />
              <span className="tabular" style={{ fontWeight: 600 }}>
                {formatCurrency(Math.abs(sisa))}
              </span>
            </span>
          )}
        </div>

        <button
          type="button"
          className="button button--primary"
          disabled={setShares.isPending || !seimbang}
          onClick={() => void simpan()}
        >
          {setShares.isPending ? <span className="spinner" /> : 'Simpan pembagian'}
        </button>

        {!seimbang ? (
          <p className="caption" style={{ marginTop: 'var(--space-2)', color: 'var(--color-danger)' }}>
            <IconInfo size={14} /> Jumlah bagian harus sama dengan nominal pengeluaran.
          </p>
        ) : null}
      </div>
    </div>
  );
}
