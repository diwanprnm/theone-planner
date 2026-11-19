import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../components/AppBar';
import { BottomNav } from '../components/BottomNav';
import { EmptyState } from '../components/EmptyState';
import { IconPlus, IconSearch } from '../components/Icons';
import { OfflineBanner } from '../components/OfflineBanner';
import { ProgressBar } from '../components/ProgressBar';
import { StatusChip } from '../components/StatusChip';
import { SyncPill } from '../components/SyncPill';
import { useEvents } from '../hooks/useApi';
import { useOnline } from '../hooks/useOnline';
import { useSync } from '../hooks/useSync';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDateRange,
  initials,
} from '../lib/format';
import type { EventSummary } from '../lib/types';

export function BerandaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const online = useOnline();
  const { flush } = useSync();
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  const { data: events, isLoading, error } = useEvents(user?.id);

  // Ringkasan lintas-acara: jumlahkan anggaran & realisasi semua Acara.
  const totals = useMemo(() => {
    const rows = events ?? [];
    const budget = rows.reduce((sum, event) => sum + Number(event.budgetTotal), 0);
    const realized = rows.reduce((sum, event) => sum + Number(event.realizedTotal), 0);

    return { budget, realized, remaining: budget - realized };
  }, [events]);

  const filtered = useMemo(() => {
    const rows = events ?? [];
    const keyword = search.trim().toLowerCase();

    return keyword ? rows.filter((event) => event.name.toLowerCase().includes(keyword)) : rows;
  }, [events, search]);

  return (
    <div className="app-shell">
      <AppBar
        title="Beranda"
        titleLeft
        trailing={
          <button
            type="button"
            className="avatar"
            aria-label="Buka pengaturan"
            onClick={() => navigate('/pengaturan')}
          >
            {initials(user?.user_metadata?.full_name ?? user?.email ?? 'P')}
          </button>
        }
      />

      <div className="screen">
        {!online ? <OfflineBanner /> : null}

        <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 'var(--space-3)' }}>
          <SyncPill onClick={() => void flush()} />
        </div>

        {events && events.length > 0 ? (
          <section className="card card--tinted">
            <p className="caption" style={{ fontWeight: 600 }}>
              Semua acara
            </p>
            <div className="row" style={{ marginTop: 'var(--space-3)' }}>
              <span className="caption">Anggaran</span>
              <span className="tabular" style={{ fontWeight: 600 }}>
                {formatCurrency(totals.budget)}
              </span>
            </div>
            <div className="row" style={{ marginTop: 'var(--space-1)' }}>
              <span className="caption">Realisasi</span>
              <span className="tabular" style={{ fontWeight: 600 }}>
                {formatCurrency(totals.realized)}
              </span>
            </div>
            <div style={{ margin: 'var(--space-4) 0 var(--space-3)' }}>
              <ProgressBar spent={totals.realized} budget={totals.budget} />
            </div>
            <p className="caption">Sisa {formatCurrency(totals.remaining)}</p>
          </section>
        ) : null}

        <section className="section">
          <div className="section__header">
            <h2 className="section__title">Acara kamu</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Cari acara"
              onClick={() => setSearching((value) => !value)}
            >
              <IconSearch size={20} />
            </button>
          </div>

          {searching ? (
            <label className="field">
              <input
                className="field__input"
                placeholder="Cari nama acara"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                autoFocus
              />
            </label>
          ) : null}

          {isLoading ? (
            <p className="caption">Memuat acara…</p>
          ) : error ? (
            <div className="alert alert--danger" role="alert">
              {error instanceof Error ? error.message : 'Gagal memuat acara.'}
            </div>
          ) : filtered.length === 0 ? (
            search ? (
              <p className="caption">Tidak ada acara yang cocok dengan “{search}”.</p>
            ) : (
              <EmptyState
                title="Belum ada acara"
                hint="Buat acara pertamamu untuk mulai mencatat"
                actionLabel="Buat acara"
                onAction={() => navigate('/acara/baru')}
              />
            )
          ) : (
            <ul className="list stack">
              {filtered.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} onClick={() => navigate(`/acara/${event.id}`)} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <button
        type="button"
        className="fab"
        aria-label="Buat acara"
        onClick={() => navigate('/acara/baru')}
      >
        <IconPlus size={26} />
      </button>

      <BottomNav />
    </div>
  );
}

function EventCard({ event, onClick }: { event: EventSummary; onClick: () => void }) {
  return (
    <button type="button" className="card" onClick={onClick} style={{ width: '100%', textAlign: 'left' }}>
      <div className="row">
        <span style={{ fontSize: 16, fontWeight: 600 }}>{event.name}</span>
        <StatusChip status={event.status} />
      </div>

      <p className="caption" style={{ marginTop: 'var(--space-1)' }}>
        {formatDateRange(event.startDate, event.endDate)} · {event.participantCount} peserta
      </p>

      <div style={{ margin: 'var(--space-3) 0 var(--space-2)' }}>
        <ProgressBar spent={event.realizedTotal} budget={event.budgetTotal} thin />
      </div>

      <p className="caption amount" style={{ textAlign: 'right' }}>
        {formatCurrencyCompact(event.realizedTotal)} / {formatCurrencyCompact(event.budgetTotal)}
      </p>
    </button>
  );
}
