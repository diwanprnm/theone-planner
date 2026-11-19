import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../components/AppBar';
import { IconAlert } from '../components/Icons';
import { useCreateEvent } from '../hooks/useApi';
import { formatCurrencyInput, parseCurrencyInput, toDateInputValue } from '../lib/format';
import type { EventStatus } from '../lib/types';

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'BERJALAN', label: 'Berjalan' },
  { value: 'SELESAI', label: 'Selesai' },
];

export function BuatAcaraPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createEvent = useCreateEvent(user?.id);

  const today = toDateInputValue(new Date());

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [fundsRaised, setFundsRaised] = useState(0);
  const [status, setStatus] = useState<EventStatus>('DRAFT');
  const [nameError, setNameError] = useState<string | null>(null);

  async function save() {
    setNameError(null);

    if (!name.trim()) {
      setNameError('Nama acara wajib diisi');
      return;
    }

    const created = await createEvent.mutateAsync({
      name: name.trim(),
      startDate,
      // Tanggal selesai tidak boleh mendahului tanggal mulai.
      endDate: endDate < startDate ? startDate : endDate,
      status,
      ...(fundsRaised > 0 ? { fundsRaised } : {}),
    });

    navigate(`/acara/${created.id}`, { replace: true });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void save();
  }

  return (
    <div className="app-shell">
      <AppBar
        title="Buat Acara"
        back
        action={{
          label: createEvent.isPending ? '…' : 'Simpan',
          onClick: () => void save(),
          disabled: createEvent.isPending,
        }}
      />

      <form className="screen screen--no-nav" onSubmit={handleSubmit}>
        {createEvent.error ? (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            <IconAlert size={16} />
            <span>
              {createEvent.error instanceof Error
                ? createEvent.error.message
                : 'Gagal menyimpan acara.'}
            </span>
          </div>
        ) : null}

        <label className="field">
          <span className="field__label">Nama acara</span>
          <input
            className={`field__input${nameError ? ' field__input--error' : ''}`}
            placeholder="Contoh: Outing Bali 2026"
            value={name}
            onChange={(event) => setName(event.target.value)}
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
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Tanggal selesai</span>
            <input
              type="date"
              className="field__input"
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">Uang terkumpul (opsional)</span>
          <div className="amount-field">
            <span className="amount-field__prefix">Rp</span>
            <input
              className="amount-field__input"
              inputMode="numeric"
              placeholder="0"
              value={formatCurrencyInput(fundsRaised)}
              onChange={(event) => setFundsRaised(parseCurrencyInput(event.target.value))}
            />
          </div>
          <span className="field__hint">
            Total iuran yang sudah masuk dari peserta. Boleh dikosongkan.
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
          disabled={createEvent.isPending}
          style={{ marginTop: 'var(--space-4)' }}
        >
          {createEvent.isPending ? <span className="spinner" /> : 'Simpan acara'}
        </button>
      </form>
    </div>
  );
}
