import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../components/AppBar';
import { IconAlert, IconTrash } from '../components/Icons';
import { useDeleteEvent, useEvent, useUpdateEvent } from '../hooks/useApi';
import { formatCurrencyInput, parseCurrencyInput, toDateInputValue } from '../lib/format';
import type { EventStatus } from '../lib/types';

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'BERJALAN', label: 'Berjalan' },
  { value: 'SELESAI', label: 'Selesai' },
];

/** Ubah Acara — termasuk Uang Terkumpul, yang selalu satu angka per Acara. */
export function UbahAcaraPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: event, isLoading } = useEvent(eventId);
  const updateEvent = useUpdateEvent(user?.id, eventId ?? '');
  const deleteEvent = useDeleteEvent(user?.id);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fundsRaised, setFundsRaised] = useState(0);
  const [status, setStatus] = useState<EventStatus>('DRAFT');
  const [nameError, setNameError] = useState<string | null>(null);
  const [confirmHapus, setConfirmHapus] = useState(false);

  useEffect(() => {
    if (!event) {
      return;
    }

    setName(event.name);
    setStartDate(toDateInputValue(event.startDate));
    setEndDate(toDateInputValue(event.endDate));
    setFundsRaised(event.fundsRaised ? Number(event.fundsRaised) : 0);
    setStatus(event.status);
  }, [event]);

  async function save() {
    setNameError(null);

    if (!name.trim()) {
      setNameError('Nama acara wajib diisi');
      return;
    }

    await updateEvent.mutateAsync({
      name: name.trim(),
      startDate,
      endDate: endDate < startDate ? startDate : endDate,
      status,
      fundsRaised,
    });

    navigate(`/acara/${eventId}`, { replace: true });
  }

  function handleSubmit(submitEvent: FormEvent) {
    submitEvent.preventDefault();
    void save();
  }

  async function hapus() {
    await deleteEvent.mutateAsync(eventId ?? '');
    navigate('/beranda', { replace: true });
  }

  if (isLoading || !event) {
    return (
      <div className="app-shell">
        <AppBar title="Ubah Acara" back />
        <p className="screen caption">{isLoading ? 'Memuat acara…' : 'Acara tidak ditemukan.'}</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppBar
        title="Ubah Acara"
        back
        action={{
          label: updateEvent.isPending ? '…' : 'Simpan',
          onClick: () => void save(),
          disabled: updateEvent.isPending,
        }}
      />

      <form className="screen screen--no-nav" onSubmit={handleSubmit}>
        {updateEvent.error ? (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            <IconAlert size={16} />
            <span>
              {updateEvent.error instanceof Error
                ? updateEvent.error.message
                : 'Gagal menyimpan acara.'}
            </span>
          </div>
        ) : null}

        <label className="field">
          <span className="field__label">Nama acara</span>
          <input
            className={`field__input${nameError ? ' field__input--error' : ''}`}
            value={name}
            onChange={(inputEvent) => setName(inputEvent.target.value)}
          />
          {nameError ? (
            <span className="field__error">
              <IconAlert size={14} />
              {nameError}
            </span>
          ) : null}
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          <label className="field">
            <span className="field__label">Tanggal mulai</span>
            <input
              type="date"
              className="field__input"
              value={startDate}
              onChange={(inputEvent) => setStartDate(inputEvent.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Tanggal selesai</span>
            <input
              type="date"
              className="field__input"
              value={endDate}
              min={startDate}
              onChange={(inputEvent) => setEndDate(inputEvent.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">Uang terkumpul</span>
          <div className="amount-field">
            <span className="amount-field__prefix">Rp</span>
            <input
              className="amount-field__input"
              inputMode="numeric"
              placeholder="0"
              value={formatCurrencyInput(fundsRaised)}
              onChange={(inputEvent) => setFundsRaised(parseCurrencyInput(inputEvent.target.value))}
            />
          </div>
          <span className="field__hint">
            Satu angka total untuk acara ini — bukan daftar iuran per peserta.
          </span>
        </label>

        <div className="field">
          <span className="field__label">Status</span>
          <div className="segmented">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`segmented__item${status === option.value ? ' segmented__item--active' : ''}`}
                onClick={() => setStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="button button--primary"
          disabled={updateEvent.isPending}
          style={{ marginTop: 'var(--space-4)' }}
        >
          {updateEvent.isPending ? <span className="spinner" /> : 'Simpan perubahan'}
        </button>

        <button
          type="button"
          className="button button--danger"
          style={{ marginTop: 'var(--space-3)' }}
          onClick={() => setConfirmHapus(true)}
        >
          <IconTrash size={18} />
          Hapus acara
        </button>
      </form>

      {confirmHapus ? (
        <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="hapus-acara-judul">
          <div className="dialog__panel">
            <h2 id="hapus-acara-judul" className="sheet__title">
              Hapus acara?
            </h2>
            <p className="caption">
              Semua kegiatan, item anggaran, pengeluaran, dan pembagian di dalamnya akan dihapus
              permanen. Tindakan ini tidak bisa dibatalkan.
            </p>

            <div className="dialog__actions">
              <button
                type="button"
                className="button button--outlined"
                onClick={() => setConfirmHapus(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="button button--danger"
                disabled={deleteEvent.isPending}
                onClick={() => void hapus()}
              >
                {deleteEvent.isPending ? <span className="spinner" /> : 'Hapus permanen'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
