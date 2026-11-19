import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../components/AppBar';
import { BottomNav } from '../components/BottomNav';
import { IconChevronRight } from '../components/Icons';
import { ProgressBar } from '../components/ProgressBar';
import { StatusChip } from '../components/StatusChip';
import { useEvents, queryKeys } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDateRange,
} from '../lib/format';
import type { CategoryBreakdownRow, ReportSummary, TalanganRow } from '../lib/types';

type Tab = 'ringkasan' | 'kategori' | 'talangan';

const TABS: { value: Tab; label: string }[] = [
  { value: 'ringkasan', label: 'Ringkasan' },
  { value: 'kategori', label: 'Per Kategori' },
  { value: 'talangan', label: 'Talangan' },
];

export function LaporanPage() {
  const { eventId } = useParams<{ eventId: string }>();

  return (
    <div className="app-shell">
      <AppBar
        title="Laporan"
        back={Boolean(eventId)}
        backTo={eventId ? `/acara/${eventId}` : undefined}
        titleLeft={!eventId}
        trailing={
          <button type="button" className="app-bar__action" disabled title="Segera hadir">
            Bagikan
          </button>
        }
      />

      <div className="screen">
        {eventId ? (
          <LaporanAcara eventId={eventId} />
        ) : (
          <DaftarLaporan />
        )}
      </div>

      {!eventId ? <BottomNav /> : null}
    </div>
  );
}

/** Tab Laporan dari bilah bawah: pilih acara mana yang mau dilihat. */
function DaftarLaporan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: events, isLoading } = useEvents(user?.id);

  if (isLoading) {
    return <p className="caption">Memuat acara…</p>;
  }

  if (!events || events.length === 0) {
    return <p className="caption">Belum ada acara. Buat acara dulu untuk melihat laporannya.</p>;
  }

  return (
    <section>
      <p className="caption" style={{ marginBottom: 'var(--space-3)' }}>
        Pilih acara untuk melihat laporannya.
      </p>

      <div className="list__card">
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            className="list__row list__row--button"
            onClick={() => navigate(`/acara/${event.id}/laporan`)}
          >
            <span className="list__body">
              <span className="list__title">{event.name}</span>
              <span className="list__subtitle">
                {formatDateRange(event.startDate, event.endDate)}
              </span>
            </span>
            <StatusChip status={event.status} />
            <IconChevronRight size={16} />
          </button>
        ))}
      </div>
    </section>
  );
}

function LaporanAcara({ eventId }: { eventId: string }) {
  const [tab, setTab] = useState<Tab>('ringkasan');

  const { data: summary, isLoading } = useQuery({
    queryKey: queryKeys.eventReport(eventId),
    queryFn: () => api.get<ReportSummary>(`/events/${eventId}/reports/summary`),
  });

  return (
    <>
      <div className="tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={tab === item.value}
            className={`tabs__item${tab === item.value ? ' tabs__item--active' : ''}`}
            onClick={() => setTab(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="caption">Memuat laporan…</p>
      ) : !summary ? (
        <div className="alert alert--danger" role="alert">
          Gagal memuat laporan.
        </div>
      ) : (
        <>
          {tab === 'ringkasan' ? <RingkasanTab summary={summary} /> : null}
          {tab === 'kategori' ? <KategoriTab eventId={eventId} /> : null}
          {tab === 'talangan' ? <TalanganTab eventId={eventId} /> : null}
        </>
      )}
    </>
  );
}

function RingkasanTab({ summary }: { summary: ReportSummary }) {
  return (
    <>
      <section className="card">
        <div className="row">
          <span className="caption">Anggaran</span>
          <span className="tabular" style={{ fontWeight: 600 }}>
            {formatCurrency(summary.budgetTotal)}
          </span>
        </div>
        <div className="row" style={{ marginTop: 'var(--space-2)' }}>
          <span className="caption">Realisasi</span>
          <span className="tabular" style={{ fontWeight: 600 }}>
            {formatCurrency(summary.realizedTotal)}
          </span>
        </div>
        <div style={{ margin: 'var(--space-4) 0 var(--space-3)' }}>
          <ProgressBar spent={summary.realizedTotal} budget={summary.budgetTotal} />
        </div>
        <p className="caption">Sisa {formatCurrency(summary.remaining)}</p>
      </section>

      {summary.surplus !== null ? (
        <section className="card" style={{ background: 'var(--color-success-tint)', marginTop: 'var(--space-4)' }}>
          <p className="caption">
            Uang terkumpul {formatCurrency(summary.fundsRaised ?? 0)}
          </p>
          <p
            className="tabular"
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: Number(summary.surplus) < 0 ? 'var(--color-danger)' : 'var(--color-success)',
              marginTop: 'var(--space-2)',
            }}
          >
            {Number(summary.surplus) < 0 ? 'Defisit ' : 'Surplus '}
            {formatCurrency(Math.abs(Number(summary.surplus)))}
          </p>
        </section>
      ) : null}

      <section className="section">
        <h2 className="section__title" style={{ marginBottom: 'var(--space-3)' }}>
          Anggaran vs Realisasi per Kegiatan
        </h2>

        {summary.perActivity.length === 0 ? (
          <p className="caption">Belum ada kegiatan pada acara ini.</p>
        ) : (
          <div className="list__card">
            {summary.perActivity.map((row) => {
              const delta = Number(row.delta);
              return (
                <div key={row.activityId} className="list__row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-2)' }}>
                  <div className="row">
                    <span className="list__title">{row.name}</span>
                    <span
                      className={`chip ${delta < 0 ? 'chip--danger' : 'chip--success'}`}
                    >
                      {delta < 0 ? '−' : '+'}
                      {formatCurrencyCompact(Math.abs(delta))}
                    </span>
                  </div>
                  <ProgressBar spent={row.realizedTotal} budget={row.budgetTotal} thin />
                  <span className="caption amount">
                    {formatCurrencyCompact(row.realizedTotal)} /{' '}
                    {formatCurrencyCompact(row.budgetTotal)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

function KategoriTab({ eventId }: { eventId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.reportByCategory(eventId),
    queryFn: () => api.get<CategoryBreakdownRow[]>(`/events/${eventId}/reports/by-category`),
  });

  if (isLoading) {
    return <p className="caption">Memuat…</p>;
  }

  if (!data || data.length === 0) {
    return <p className="caption">Belum ada pengeluaran untuk dikelompokkan.</p>;
  }

  const max = Math.max(...data.map((row) => Number(row.total)));

  return (
    <section className="card">
      <h2 className="section__title" style={{ marginBottom: 'var(--space-4)' }}>
        Pengeluaran per kategori
      </h2>

      <div className="stack">
        {data.map((row) => (
          <div key={row.categoryId ?? 'tanpa-kategori'}>
            <div className="row" style={{ marginBottom: 'var(--space-2)' }}>
              <span className="caption" style={{ fontWeight: 600 }}>
                {row.categoryName}
              </span>
              <span className="tabular caption">{formatCurrency(row.total)}</span>
            </div>
            <div className="progress">
              <div
                className="progress__fill"
                style={{
                  width: `${max > 0 ? (Number(row.total) / max) * 100 : 0}%`,
                  background: 'var(--color-primary)',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TalanganTab({ eventId }: { eventId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.reportTalangan(eventId),
    queryFn: () => api.get<TalanganRow[]>(`/events/${eventId}/reports/talangan`),
  });

  if (isLoading) {
    return <p className="caption">Memuat…</p>;
  }

  if (!data || data.length === 0) {
    return <p className="caption">Belum ada talangan pada acara ini.</p>;
  }

  return (
    <section>
      <p className="caption" style={{ marginBottom: 'var(--space-3)' }}>
        Berapa tiap orang menalangi lebih dulu.
      </p>

      <div className="list__card">
        {data.map((row) => (
          <div key={row.participantId} className="list__row">
            <span className="avatar avatar--sm">{row.participantName.charAt(0)}</span>
            <span className="list__body">
              <span className="list__title">{row.participantName}</span>
              <span className="list__subtitle">Menalangi</span>
            </span>
            <span className="list__trailing">{formatCurrency(row.total)}</span>
          </div>
        ))}
      </div>

      <p className="muted-note">
        Aplikasi tidak menghitung utang bersih antar orang. Penggantian dilakukan manual.
      </p>
    </section>
  );
}
