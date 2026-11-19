import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../components/AppBar';
import { IconAlert, IconCamera, IconClose } from '../components/Icons';
import { OfflineBanner } from '../components/OfflineBanner';
import {
  useActivities,
  useActivity,
  useBudgetItems,
  useCategories,
  useCreateExpense,
  useParticipants,
  useUploadReceipt,
} from '../hooks/useApi';
import { useOnline } from '../hooks/useOnline';
import {
  OPSI_METODE_PEMBAYARAN,
  formatCurrencyInput,
  parseCurrencyInput,
  toDateInputValue,
} from '../lib/format';
import type { PaymentMethod } from '../lib/types';

/**
 * Catat Pengeluaran (Prompt 10) — layar yang dipakai cepat di lokasi acara,
 * sering sambil berdiri. Nominal ditaruh paling atas dan besar.
 *
 * Bisa dibuka dari dua rute:
 *   /acara/:eventId/pengeluaran/baru  → eventId langsung diketahui
 *   /kegiatan/:activityId/pengeluaran/baru → eventId menyusul dari Kegiatan
 */
export function CatatPengeluaranPage() {
  const { eventId: eventIdParam, activityId: activityIdParam } = useParams<{
    eventId?: string;
    activityId?: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const online = useOnline();

  const [activityId, setActivityId] = useState(
    activityIdParam ?? searchParams.get('kegiatan') ?? '',
  );

  // Kegiatan yang dipilih menentukan Acara-nya. Bila dibuka dari rute Acara,
  // eventId sudah ada; kalau dari rute Kegiatan, eventId diambil dari sini.
  const { data: activity } = useActivity(activityId || undefined);
  const eventId = eventIdParam ?? activity?.eventId;

  const { data: activities } = useActivities(eventId);
  const { data: categories } = useCategories(user?.id);
  const { data: participants } = useParticipants(eventId);
  // Item Anggaran milik Kegiatan yang dipilih — pengeluaran bisa ditautkan
  // ke rencana biayanya supaya realisasi item itu ikut terhitung.
  const { data: budgetItems } = useBudgetItems(activityId || undefined);

  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [budgetItemId, setBudgetItemId] = useState<string>('');
  const [payerId, setPayerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER_BANK');
  const [error, setError] = useState<string | null>(null);

  // Foto struk disimpan sebagai File di memori sampai pengeluaran tersimpan.
  // Struk butuh koneksi (berkas tidak masuk antrean offline), jadi pemilih
  // foto dimatikan saat offline — bukan dibiarkan lalu gagal diam-diam.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const createExpense = useCreateExpense(activityId, eventId);
  const uploadReceipt = useUploadReceipt(activityId, eventId);

  function pilihFoto(file: File | null) {
    // Lepaskan URL objek lama supaya tidak menumpuk di memori.
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
    }

    if (!file) {
      setReceiptFile(null);
      setReceiptPreview(null);
      return;
    }

    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  // Kegiatan pertama dipilih otomatis bila hanya ada satu.
  useEffect(() => {
    if (!activityId && activities && activities.length === 1) {
      setActivityId(activities[0].id);
    }
  }, [activities, activityId]);

  // Item Anggaran terikat pada satu Kegiatan; bila Kegiatan berganti, tautan
  // lama tidak lagi berlaku dan harus dikosongkan.
  useEffect(() => {
    setBudgetItemId('');
  }, [activityId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (amount <= 0) {
      setError('Nominal pengeluaran harus lebih dari nol.');
      return;
    }

    if (!description.trim()) {
      setError('Keterangan wajib diisi.');
      return;
    }

    if (!activityId) {
      setError('Pilih kegiatan tempat pengeluaran ini dicatat.');
      return;
    }

    // Biaya dibagi ke Peserta Acara (server membagi rata). Tanpa peserta,
    // tidak ada yang bisa menanggungnya — server akan menolak, jadi lebih
    // baik dicegah di sini dengan pesan yang jelas.
    if (participants && participants.length === 0) {
      setError('Tambahkan peserta dulu di layar Peserta — biaya dibagi ke peserta acara.');
      return;
    }

    try {
      const created = await createExpense.mutateAsync({
        amount,
        description: description.trim(),
        date,
        paymentMethod,
        ...(categoryId ? { categoryId } : {}),
        ...(budgetItemId ? { budgetItemId } : {}),
        ...(payerId ? { payerId } : {}),
      });

      // `created` bernilai null bila pengeluaran masuk antrean offline — struk
      // tidak bisa ikut, jadi unggahan dilewati dan pengguna sudah diberi tahu
      // lewat catatan di bawah tombol.
      //
      // Unggahan struk dipisah dari blok try utama: pengeluaran sudah tersimpan
      // saat langkah ini berjalan, jadi kegagalan struk TIDAK boleh menahan
      // navigasi — kalau ditahan, pengguna akan mengirim ulang formulir dan
      // membuat pengeluaran ganda.
      if (created && receiptFile) {
        try {
          await uploadReceipt.mutateAsync({ expenseId: created.id, file: receiptFile });
        } catch {
          // Pengeluaran tetap tersimpan; struk bisa ditambahkan lagi nanti dari
          // Detail Kegiatan. Tidak perlu menggagalkan seluruh pengisian.
        }
      }

      if (receiptPreview) {
        URL.revokeObjectURL(receiptPreview);
      }

      navigate(`/kegiatan/${activityId}`, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menyimpan pengeluaran.');
    }
  }

  return (
    <div className="app-shell">
      <AppBar title="Catat Pengeluaran" back />

      {!online ? <OfflineBanner /> : null}

      <form className="screen screen--no-nav" onSubmit={handleSubmit}>
        {/* Nominal ditaruh paling atas dan besar — layar ini dipakai cepat
            di lokasi acara, sering sambil berdiri. */}
        <div className="amount-field amount-field--hero" style={{ marginBottom: 'var(--space-6)' }}>
          <span className="amount-field__prefix" style={{ fontSize: 24 }}>
            Rp
          </span>
          <input
            className="amount-field__input"
            inputMode="numeric"
            placeholder="0"
            value={formatCurrencyInput(amount)}
            onChange={(inputEvent) => setAmount(parseCurrencyInput(inputEvent.target.value))}
            autoFocus
          />
        </div>

        {error ? (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            <IconAlert size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <label className="field">
          <span className="field__label">Keterangan</span>
          <input
            className="field__input"
            placeholder="Contoh: Pelunasan sewa bus"
            value={description}
            onChange={(inputEvent) => setDescription(inputEvent.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">Tanggal</span>
          <input
            type="date"
            className="field__input"
            value={date}
            onChange={(inputEvent) => setDate(inputEvent.target.value)}
          />
        </label>

        <div className="field">
          <span className="field__label">Kegiatan</span>
          <select
            className="field__select"
            value={activityId}
            onChange={(inputEvent) => setActivityId(inputEvent.target.value)}
          >
            <option value="">Pilih kegiatan</option>
            {activities?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <span className="field__hint">
            Pengeluaran ini akan dihitung ke anggaran kegiatan yang dipilih.
          </span>
        </div>

        <div className="field">
          <span className="field__label">Item anggaran</span>
          <select
            className="field__select"
            value={budgetItemId}
            onChange={(inputEvent) => setBudgetItemId(inputEvent.target.value)}
            disabled={!activityId || !budgetItems || budgetItems.length === 0}
          >
            <option value="">Tanpa item anggaran</option>
            {budgetItems?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <span className="field__hint">
            {activityId && budgetItems && budgetItems.length > 0
              ? 'Menghubungkan pengeluaran ini ke rencana biayanya.'
              : 'Kegiatan ini belum punya item anggaran.'}
          </span>
        </div>

        <div className="field">
          <span className="field__label">Kategori</span>
          <div
            className="row"
            style={{ flexWrap: 'wrap', justifyContent: 'flex-start', gap: 'var(--space-2)' }}
          >
            {categories?.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`chip ${categoryId === category.id ? 'chip--berjalan' : 'chip--muted'}`}
                onClick={() => setCategoryId(category.id === categoryId ? null : category.id)}
                style={{ minHeight: 32, padding: '0 var(--space-3)' }}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {participants && participants.length > 0 ? (
          <div className="field">
            <span className="field__label">Pembayar</span>
            <select
              className="field__select"
              value={payerId}
              onChange={(inputEvent) => setPayerId(inputEvent.target.value)}
            >
              <option value="">Belum ditentukan</option>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.name}
                </option>
              ))}
            </select>
            <span className="field__hint">
              Siapa yang menalangi lebih dulu. Dipakai untuk rekap talangan.
            </span>
          </div>
        ) : null}

        <div className="field">
          <span className="field__label">Metode pembayaran</span>
          <div className="segmented" style={{ flexWrap: 'wrap' }}>
            {OPSI_METODE_PEMBAYARAN.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`segmented__item${paymentMethod === option.value ? ' segmented__item--active' : ''}`}
                onClick={() => setPaymentMethod(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">Lampiran</span>

          {/* Input berkas asli disembunyikan; kotak di bawah yang membukanya.
              `capture` membuat ponsel langsung membuka kamera. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(inputEvent) => pilihFoto(inputEvent.target.files?.[0] ?? null)}
          />

          {receiptPreview ? (
            <div className="card card--flat" style={{ padding: 'var(--space-3)' }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span className="caption" style={{ fontWeight: 600 }}>
                  Foto struk siap disimpan
                </span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Hapus foto struk"
                  onClick={() => {
                    pilihFoto(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <IconClose size={18} />
                </button>
              </div>
              <img
                src={receiptPreview}
                alt="Pratinjau foto struk"
                style={{
                  width: '100%',
                  maxHeight: 220,
                  objectFit: 'cover',
                  borderRadius: 'var(--radius)',
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              className="card card--flat text-center"
              disabled={!online}
              onClick={() => fileInputRef.current?.click()}
              style={{
                borderStyle: 'dashed',
                padding: 'var(--space-6)',
                color: 'var(--color-text-muted)',
                width: '100%',
                cursor: online ? 'pointer' : 'not-allowed',
                opacity: online ? 1 : 0.6,
              }}
            >
              <IconCamera size={28} />
              <p style={{ marginTop: 'var(--space-2)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Tambah foto struk
              </p>
              <p className="caption caption--muted">
                {online ? 'Opsional — foto akan diunggah setelah tersimpan' : 'Butuh koneksi'}
              </p>
            </button>
          )}
        </div>

        <button
          type="submit"
          className="button button--primary"
          disabled={createExpense.isPending || uploadReceipt.isPending}
          style={{ marginTop: 'var(--space-4)' }}
        >
          {createExpense.isPending || uploadReceipt.isPending ? (
            <span className="spinner" />
          ) : (
            'Simpan pengeluaran'
          )}
        </button>

        {participants && participants.length === 0 ? (
          <p className="muted-note text-center">
            Acara ini belum punya peserta. Tambahkan dulu di layar Peserta sebelum mencatat
            pengeluaran.
          </p>
        ) : null}

        {!online ? (
          <p className="muted-note text-center">
            Sedang offline — pengeluaran akan disimpan di perangkat dan dikirim saat online.
            {receiptFile ? ' Foto struk tidak ikut terkirim; tambahkan lagi setelah online.' : ''}
          </p>
        ) : null}
      </form>
    </div>
  );
}
