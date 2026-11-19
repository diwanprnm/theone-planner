import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../components/AppBar';
import { BottomNav } from '../components/BottomNav';
import {
  IconAlert,
  IconClock,
  IconMapPin,
  IconPencil,
  IconPlus,
  IconTrash,
} from '../components/Icons';
import { ProgressBar } from '../components/ProgressBar';
import {
  useActivity,
  useBudgetItems,
  useCategories,
  useCreateBudgetItem,
  useDeleteBudgetItem,
  useDeleteExpense,
  useExpenses,
  useReceiptUrl,
  useUpdateBudgetItem,
} from '../hooks/useApi';
import { useAuth } from '../auth/AuthContext';
import {
  LABEL_METODE_PEMBAYARAN,
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyInput,
  formatDate,
  formatDateShort,
  parseCurrencyInput,
} from '../lib/format';

/**
 * Detail Kegiatan — satu Kegiatan sekaligus satu baris itinerary DAN satu
 * keranjang anggaran (lihat CONTEXT.md). Karena itu layar ini menampilkan
 * info jadwal, item anggaran, dan pengeluaran dalam satu tempat.
 */
export function DetailKegiatanPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: activity, isLoading, error } = useActivity(activityId);
  const { data: budgetItems } = useBudgetItems(activityId);
  const { data: expenses } = useExpenses(activityId);
  const { data: categories } = useCategories(user?.id);

  const createItem = useCreateBudgetItem(activityId ?? '', activity?.eventId ?? '');
  const updateItem = useUpdateBudgetItem(activityId ?? '', activity?.eventId ?? '');
  const deleteItem = useDeleteBudgetItem(activityId ?? '', activity?.eventId ?? '');
  const deleteExpense = useDeleteExpense(activityId ?? '', activity?.eventId);
  const receiptUrl = useReceiptUrl();

  const [strukError, setStrukError] = useState<string | null>(null);

  /** Membuka foto struk di tab baru — URL dibuat sesaat sebelum dibuka. */
  async function lihatStruk(expenseId: string) {
    setStrukError(null);

    try {
      const { signedUrl } = await receiptUrl.mutateAsync(expenseId);
      window.open(signedUrl, '_blank', 'noopener');
    } catch (caught) {
      setStrukError(caught instanceof Error ? caught.message : 'Gagal membuka foto struk.');
    }
  }

  const [sheetOpen, setSheetOpen] = useState(false);
  // Bila `editingId` terisi, lembar yang sama dipakai untuk mengubah item —
  // bukan menambah. Satu formulir untuk dua maksud supaya tidak ada duplikasi.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState(0);
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemError, setItemError] = useState<string | null>(null);

  /** Membuka lembar dalam mode tambah, memastikan sisa isian sebelumnya bersih. */
  function bukaTambahItem() {
    setEditingId(null);
    setItemName('');
    setItemAmount(0);
    setItemCategoryId('');
    setItemError(null);
    setSheetOpen(true);
  }

  /** Membuka lembar dalam mode ubah, memuat nilai item yang dipilih. */
  function bukaUbahItem(item: {
    id: string;
    name: string;
    amount: string;
    categoryId: string | null;
  }) {
    setEditingId(item.id);
    setItemName(item.name);
    setItemAmount(Number(item.amount));
    setItemCategoryId(item.categoryId ?? '');
    setItemError(null);
    setSheetOpen(true);
  }

  function tutupSheet() {
    setSheetOpen(false);
    setEditingId(null);
  }

  if (isLoading) {
    return (
      <div className="app-shell">
        <AppBar title="Detail Kegiatan" back />
        <p className="screen caption">Memuat kegiatan…</p>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="app-shell">
        <AppBar title="Detail Kegiatan" back />
        <div className="screen">
          <div className="alert alert--danger" role="alert">
            {error instanceof Error ? error.message : 'Kegiatan tidak ditemukan.'}
          </div>
        </div>
      </div>
    );
  }

  const delta = Number(activity.remaining);

  async function saveItem() {
    setItemError(null);

    if (!itemName.trim()) {
      setItemError('Nama item wajib diisi.');
      return;
    }
    if (itemAmount <= 0) {
      setItemError('Jumlah anggaran harus lebih dari nol.');
      return;
    }

    try {
      const payload = {
        name: itemName.trim(),
        amount: itemAmount,
        ...(itemCategoryId ? { categoryId: itemCategoryId } : {}),
      };

      if (editingId) {
        await updateItem.mutateAsync({ id: editingId, ...payload });
      } else {
        await createItem.mutateAsync(payload);
      }

      tutupSheet();
      setItemName('');
      setItemAmount(0);
      setItemCategoryId('');
    } catch (caught) {
      setItemError(caught instanceof Error ? caught.message : 'Gagal menyimpan item.');
    }
  }

  const menyimpanItem = createItem.isPending || updateItem.isPending;

  return (
    <div className="app-shell">
      <AppBar
        title={activity.name}
        back
        backTo={`/acara/${activity.eventId}`}
        trailing={
          <button
            type="button"
            className="icon-button"
            aria-label="Ubah kegiatan"
            onClick={() => navigate(`/acara/${activity.eventId}/kegiatan/baru?kegiatan=${activity.id}`)}
          >
            <IconPencil size={20} />
          </button>
        }
      />

      <div className="screen">
        <section className="card">
          <div className="stack stack--tight">
            <span className="caption row" style={{ justifyContent: 'flex-start', gap: 6 }}>
              <IconClock size={16} />
              {formatDate(activity.date)}
              {activity.time ? `, ${activity.time}` : ''}
            </span>
            {activity.location ? (
              <span className="caption row" style={{ justifyContent: 'flex-start', gap: 6 }}>
                <IconMapPin size={16} />
                {activity.location}
              </span>
            ) : null}
            {activity.notes ? (
              <p className="caption" style={{ marginTop: 'var(--space-2)' }}>
                {activity.notes}
              </p>
            ) : null}
          </div>
        </section>

        <section className="section">
          <div className="stats">
            <div className="stat">
              <p className="stat__label">Anggaran</p>
              <p className="stat__value">{formatCurrencyCompact(activity.budgetTotal)}</p>
            </div>
            <div className="stat">
              <p className="stat__label">Realisasi</p>
              <p className="stat__value">{formatCurrencyCompact(activity.realizedTotal)}</p>
            </div>
          </div>
          <p style={{ marginTop: 'var(--space-3)' }}>
            <span className={`chip ${delta < 0 ? 'chip--danger' : 'chip--success'}`}>
              {delta < 0 ? 'Lebih ' : 'Sisa '}
              {formatCurrency(Math.abs(delta))}
            </span>
          </p>
        </section>

        <section className="section">
          <div className="section__header">
            <h2 className="section__title">Item Anggaran</h2>
            <button
              type="button"
              className="section__link"
              onClick={bukaTambahItem}
            >
              + Tambah
            </button>
          </div>

          {budgetItems && budgetItems.length > 0 ? (
            <div className="list__card">
              {budgetItems.map((item) => (
                <div
                  key={item.id}
                  className="list__row"
                  style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-2)' }}
                >
                  <div className="row">
                    <span className="list__title">{item.name}</span>
                    <span className="tabular" style={{ fontWeight: 600 }}>
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <span className="caption">
                    {item.expenseCount} pengeluaran · {formatCurrencyCompact(item.realizedTotal)}
                  </span>
                  <ProgressBar spent={item.realizedTotal} budget={item.amount} thin />
                  <div
                    className="row"
                    style={{ justifyContent: 'flex-end', gap: 'var(--space-4)' }}
                  >
                    <button
                      type="button"
                      className="section__link"
                      onClick={() => bukaUbahItem(item)}
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      className="section__link"
                      style={{ color: 'var(--color-danger)' }}
                      disabled={deleteItem.isPending}
                      onClick={() => void deleteItem.mutateAsync(item.id)}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="caption">
              Belum ada item anggaran. Tambahkan rencana biaya untuk kegiatan ini.
            </p>
          )}
        </section>

        <section className="section">
          <div className="section__header">
            <h2 className="section__title">Pengeluaran</h2>
            <button
              type="button"
              className="section__link"
              onClick={() => navigate(`/kegiatan/${activity.id}/pengeluaran/baru`)}
            >
              + Tambah
            </button>
          </div>

          {strukError ? (
            <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-3)' }}>
              <IconAlert size={16} />
              <span>{strukError}</span>
            </div>
          ) : null}

          {expenses && expenses.length > 0 ? (
            <div className="list__card">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="list__row"
                  style={{ flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-2)' }}
                >
                  <div className="row">
                    <span className="list__body">
                      <span className="list__title">{expense.description}</span>
                      <span className="list__subtitle">
                        {formatDateShort(expense.date)} ·{' '}
                        {LABEL_METODE_PEMBAYARAN[expense.paymentMethod]}
                        {expense.payerName ? ` · ${expense.payerName}` : ''}
                      </span>
                    </span>
                    <span className="list__trailing tabular">{formatCurrency(expense.amount)}</span>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Hapus pengeluaran ${expense.description}`}
                      disabled={deleteExpense.isPending}
                      onClick={() =>
                        void deleteExpense.mutateAsync({
                          id: expense.id,
                          description: expense.description,
                          amount: expense.amount,
                        })
                      }
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>

                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="caption caption--muted">
                      {expense.shares.length > 0
                        ? `Dibagi ke ${expense.shares.length} peserta`
                        : 'Belum dibagi'}
                    </span>
                    <span className="row" style={{ gap: 'var(--space-4)' }}>
                      {expense.receiptPath ? (
                        <button
                          type="button"
                          className="section__link"
                          disabled={receiptUrl.isPending}
                          onClick={() => void lihatStruk(expense.id)}
                        >
                          Lihat struk
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="section__link"
                        onClick={() => navigate(`/pengeluaran/${expense.id}/bagi`)}
                      >
                        Bagi biaya
                      </button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="caption">Belum ada pengeluaran pada kegiatan ini.</p>
          )}
        </section>
      </div>

      <button
        type="button"
        className="fab"
        aria-label="Catat pengeluaran"
        onClick={() => navigate(`/kegiatan/${activity.id}/pengeluaran/baru`)}
      >
        <IconPlus size={26} />
      </button>

      {sheetOpen ? (
        <div className="sheet" onClick={tutupSheet}>
          <div className="sheet__panel" onClick={(event) => event.stopPropagation()}>
            <div className="sheet__grip" />
            <h2 className="sheet__title">
              {editingId ? 'Ubah Item Anggaran' : 'Item Anggaran'}
            </h2>
            <p className="caption" style={{ marginBottom: 'var(--space-4)' }}>
              Satu baris rencana biaya di dalam kegiatan ini.
            </p>

            {itemError ? (
              <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
                <IconAlert size={16} />
                <span>{itemError}</span>
              </div>
            ) : null}

            <label className="field">
              <span className="field__label">Nama item</span>
              <input
                className="field__input"
                placeholder="Contoh: Sewa bus"
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">Jumlah anggaran</span>
              <div className="amount-field">
                <span className="amount-field__prefix">Rp</span>
                <input
                  className="amount-field__input"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatCurrencyInput(itemAmount)}
                  onChange={(event) => setItemAmount(parseCurrencyInput(event.target.value))}
                />
              </div>
            </label>

            <label className="field">
              <span className="field__label">Kategori</span>
              <select
                className="field__select"
                value={itemCategoryId}
                onChange={(event) => setItemCategoryId(event.target.value)}
              >
                <option value="">Tanpa kategori</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="alert alert--info" role="note" style={{ marginBottom: 'var(--space-4)' }}>
              <span>
                Kamu bisa mencatat beberapa pengeluaran untuk item ini — misalnya DP dulu, lalu
                pelunasan.
              </span>
            </div>

            <button
              type="button"
              className="button button--primary"
              disabled={menyimpanItem}
              onClick={() => void saveItem()}
            >
              {menyimpanItem ? (
                <span className="spinner" />
              ) : editingId ? (
                'Simpan perubahan'
              ) : (
                'Simpan item'
              )}
            </button>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
