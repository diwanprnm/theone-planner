import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { BottomNav } from '../components/BottomNav';
import {
  IconCalendar,
  IconChevronRight,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUsers,
} from '../components/Icons';
import { ProgressBar } from '../components/ProgressBar';
import { StatusChip } from '../components/StatusChip';
import { useActivities, useDeleteActivity, useEvent } from '../hooks/useApi';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDateRange,
  formatDateShort,
} from '../lib/format';

type Tab = 'ringkasan' | 'kegiatan' | 'peserta' | 'laporan';

const TABS: { value: Tab; label: string }[] = [
  { value: 'ringkasan', label: 'Ringkasan' },
  { value: 'kegiatan', label: 'Kegiatan' },
  { value: 'peserta', label: 'Peserta' },
  { value: 'laporan', label: 'Laporan' },
];

export function DetailAcaraPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('ringkasan');
  const [fabOpen, setFabOpen] = useState(false);

  const { data: event, isLoading, error } = useEvent(eventId);
  const { data: activities } = useActivities(eventId);
  const deleteActivity = useDeleteActivity(eventId ?? '');

  if (isLoading) {
    return (
      <div className="app-shell">
        <AppBar title="Detail Acara" back />
        <p className="screen caption">Memuat acara…</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="app-shell">
        <AppBar title="Detail Acara" back />
        <div className="screen">
          <div className="alert alert--danger" role="alert">
            {error instanceof Error ? error.message : 'Acara tidak ditemukan.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppBar
        title={event.name}
        back
        trailing={
          <button
            type="button"
            className="icon-button"
            aria-label="Ubah acara"
            onClick={() => navigate(`/acara/${event.id}/ubah`)}
          >
            <IconPencil size={20} />
          </button>
        }
      />

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

      <div className="screen">
        {tab === 'ringkasan' ? (
          <>
            <section className="card">
              <div className="row">
                <StatusChip status={event.status} />
              </div>
              <div className="stack stack--tight" style={{ marginTop: 'var(--space-3)' }}>
                <span className="caption row" style={{ justifyContent: 'flex-start', gap: 6 }}>
                  <IconCalendar size={16} />
                  {formatDateRange(event.startDate, event.endDate)}
                </span>
                <span className="caption row" style={{ justifyContent: 'flex-start', gap: 6 }}>
                  <IconUsers size={16} />
                  {event.participantCount} peserta
                </span>
              </div>
            </section>

            <section className="section">
              <div className="stats">
                <div className="stat">
                  <p className="stat__label">Anggaran</p>
                  <p className="stat__value">{formatCurrencyCompact(event.budgetTotal)}</p>
                </div>
                <div className="stat">
                  <p className="stat__label">Realisasi</p>
                  <p className="stat__value">{formatCurrencyCompact(event.realizedTotal)}</p>
                </div>
                <div className="stat">
                  <p className="stat__label">Sisa</p>
                  <p
                    className={`stat__value ${Number(event.remaining) < 0 ? 'stat__value--danger' : 'stat__value--success'}`}
                  >
                    {formatCurrencyCompact(event.remaining)}
                  </p>
                </div>
              </div>
            </section>

            <section className="section">
              <ProgressBar spent={event.realizedTotal} budget={event.budgetTotal} showLabel />
            </section>

            <section className="section">
              <div className="card card--flat row">
                <span className="caption">Uang terkumpul</span>
                <span className="row" style={{ gap: 'var(--space-2)' }}>
                  <span className="tabular" style={{ fontWeight: 600 }}>
                    {event.fundsRaised ? formatCurrency(event.fundsRaised) : '—'}
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Ubah uang terkumpul"
                    onClick={() => navigate(`/acara/${event.id}/ubah`)}
                  >
                    <IconPencil size={16} />
                  </button>
                </span>
              </div>
            </section>

            <section className="section">
              <div className="section__header">
                <h2 className="section__title">Kegiatan</h2>
                <button type="button" className="section__link" onClick={() => setTab('kegiatan')}>
                  Lihat semua
                </button>
              </div>

              {activities && activities.length > 0 ? (
                <div className="list__card">
                  {activities.slice(0, 3).map((activity, index) => (
                    <button
                      key={activity.id}
                      type="button"
                      className="list__row list__row--button"
                      onClick={() => navigate(`/kegiatan/${activity.id}`)}
                    >
                      <span className="avatar avatar--sm">{index + 1}</span>
                      <span className="list__body">
                        <span className="list__title">{activity.name}</span>
                        <span className="list__subtitle">
                          {formatDateShort(activity.date)}
                          {activity.time ? `, ${activity.time}` : ''}
                          {activity.location ? ` · ${activity.location}` : ''}
                        </span>
                      </span>
                      <span className="list__trailing">
                        {formatCurrencyCompact(activity.realizedTotal)} /{' '}
                        {formatCurrencyCompact(activity.budgetTotal)}
                        <IconChevronRight size={16} />
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="caption">Belum ada kegiatan. Tambahkan kegiatan pertama acara ini.</p>
              )}
            </section>

            <p className="muted-note">
              Aplikasi tidak menghitung utang bersih antar orang. Rekap talangan hanya menunjukkan
              berapa tiap orang menalangi lebih dulu.
            </p>
          </>
        ) : null}

        {tab === 'kegiatan' ? (
          <section>
            <div className="section__header">
              <h2 className="section__title">Semua kegiatan</h2>
              <button
                type="button"
                className="section__link"
                onClick={() => navigate(`/acara/${event.id}/kegiatan/baru`)}
              >
                + Tambah
              </button>
            </div>

            {activities && activities.length > 0 ? (
              <div className="list__card">
                {activities.map((activity, index) => (
                  <div key={activity.id} className="list__row">
                    <button
                      type="button"
                      className="list__row--button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        flex: 1,
                        padding: 0,
                        border: 'none',
                        background: 'transparent',
                        font: 'inherit',
                        color: 'inherit',
                        textAlign: 'left',
                        cursor: 'pointer',
                        minWidth: 0,
                      }}
                      onClick={() => navigate(`/kegiatan/${activity.id}`)}
                    >
                      <span className="avatar avatar--sm">{index + 1}</span>
                      <span className="list__body">
                        <span className="list__title">{activity.name}</span>
                        <span className="list__subtitle">
                          {formatDateShort(activity.date)}
                          {activity.time ? `, ${activity.time}` : ''}
                          {activity.location ? ` · ${activity.location}` : ''}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Hapus kegiatan ${activity.name}`}
                      disabled={deleteActivity.isPending}
                      onClick={() => void deleteActivity.mutateAsync(activity.id)}
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="caption">Belum ada kegiatan.</p>
            )}
          </section>
        ) : null}

        {tab === 'peserta' ? (
          <section>
            <div className="section__header">
              <h2 className="section__title">Peserta</h2>
              <button
                type="button"
                className="section__link"
                onClick={() => navigate(`/acara/${event.id}/peserta`)}
              >
                Kelola
              </button>
            </div>
            <p className="caption">
              {event.participantCount} peserta terdaftar. Buka “Kelola” untuk menambah atau
              mengubah nama.
            </p>
          </section>
        ) : null}

        {tab === 'laporan' ? (
          <section>
            <div className="section__header">
              <h2 className="section__title">Laporan acara ini</h2>
            </div>
            <button
              type="button"
              className="button button--outlined"
              onClick={() => navigate(`/acara/${event.id}/laporan`)}
            >
              Buka laporan
            </button>
          </section>
        ) : null}
      </div>

      {fabOpen ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40,
            background: 'rgba(15, 23, 42, 0.35)',
          }}
          onClick={() => setFabOpen(false)}
        >
          <div
            className="card"
            style={{
              position: 'absolute',
              right: 'var(--space-4)',
              bottom: 'calc(var(--bottom-nav-height) + 84px)',
              display: 'grid',
              gap: 'var(--space-2)',
            }}
            onClick={(clickEvent) => clickEvent.stopPropagation()}
          >
            <button
              type="button"
              className="button button--ghost button--auto"
              onClick={() => navigate(`/acara/${event.id}/kegiatan/baru`)}
            >
              Tambah Kegiatan
            </button>
            <button
              type="button"
              className="button button--ghost button--auto"
              onClick={() => navigate(`/acara/${event.id}/pengeluaran/baru`)}
            >
              Catat Pengeluaran
            </button>
            <button
              type="button"
              className="button button--ghost button--auto"
              onClick={() => navigate(`/acara/${event.id}/peserta`)}
            >
              Tambah Peserta
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="fab"
        aria-label="Tambah"
        aria-expanded={fabOpen}
        onClick={() => setFabOpen((value) => !value)}
      >
        <IconPlus size={26} />
      </button>

      <BottomNav />
    </div>
  );
}
