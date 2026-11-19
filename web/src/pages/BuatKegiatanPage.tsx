import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { IconAlert, IconMapPin } from '../components/Icons';
import { useActivity, useCreateActivity, useUpdateActivity } from '../hooks/useApi';
import { toDateInputValue } from '../lib/format';

/**
 * Form Kegiatan — dipakai untuk membuat dan mengubah.
 * Bila `?kegiatan=<id>` ada di URL, form mengubah Kegiatan itu.
 */
export function BuatKegiatanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('kegiatan') ?? undefined;
  const navigate = useNavigate();

  const { data: existing } = useActivity(activityId);
  const createActivity = useCreateActivity(eventId ?? '');
  const updateActivity = useUpdateActivity(activityId ?? '', eventId ?? '');
  const saving = activityId ? updateActivity : createActivity;

  const [name, setName] = useState('');
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  // Isi form begitu data Kegiatan yang diubah selesai dimuat.
  useEffect(() => {
    if (!activityId || !existing) {
      return;
    }

    setName(existing.name);
    setDate(toDateInputValue(existing.date));
    setTime(existing.time ?? '');
    setLocation(existing.location ?? '');
    setNotes(existing.notes ?? '');
  }, [activityId, existing]);

  async function save() {
    setNameError(null);

    if (!name.trim()) {
      setNameError('Nama kegiatan wajib diisi');
      return;
    }

    const payload = {
      name: name.trim(),
      date,
      ...(time ? { time } : {}),
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    if (activityId) {
      await updateActivity.mutateAsync(payload);
      navigate(`/kegiatan/${activityId}`, { replace: true });
      return;
    }

    const created = await createActivity.mutateAsync(payload);
    navigate(`/kegiatan/${created.id}`, { replace: true });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void save();
  }

  return (
    <div className="app-shell">
      <AppBar
        title={activityId ? 'Ubah Kegiatan' : 'Buat Kegiatan'}
        back
        action={{
          label: saving.isPending ? '…' : 'Simpan',
          onClick: () => void save(),
          disabled: saving.isPending,
        }}
      />

      <form className="screen screen--no-nav" onSubmit={handleSubmit}>
        {saving.error ? (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            <IconAlert size={16} />
            <span>
              {saving.error instanceof Error ? saving.error.message : 'Gagal menyimpan kegiatan.'}
            </span>
          </div>
        ) : null}

        <label className="field">
          <span className="field__label">Nama kegiatan</span>
          <input
            className={`field__input${nameError ? ' field__input--error' : ''}`}
            placeholder="Contoh: Hari 1: Kedatangan"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus={!activityId}
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
            <span className="field__label">Tanggal</span>
            <input
              type="date"
              className="field__input"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field__label">Jam</span>
            <input
              type="time"
              className="field__input"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">Lokasi</span>
          <div className="field__input row" style={{ gap: 'var(--space-2)' }}>
            <IconMapPin size={18} />
            <input
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                flex: 1,
                font: 'inherit',
                color: 'inherit',
                minWidth: 0,
              }}
              placeholder="Contoh: Bandara Ngurah Rai"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
        </label>

        <label className="field">
          <span className="field__label">Catatan</span>
          <textarea
            className="field__textarea"
            placeholder="Opsional"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        <p className="muted-note">
          Urutan kegiatan mengikuti tanggal dan jamnya. Kegiatan yang lebih awal tampil lebih dulu.
        </p>

        <button
          type="submit"
          className="button button--primary"
          disabled={saving.isPending}
          style={{ marginTop: 'var(--space-4)' }}
        >
          {saving.isPending ? <span className="spinner" /> : 'Simpan kegiatan'}
        </button>
      </form>
    </div>
  );
}
