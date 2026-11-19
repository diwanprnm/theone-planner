import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { AppBar } from '../components/AppBar';
import { IconAlert, IconPlus, IconTrash } from '../components/Icons';
import { useCategories, useCreateCategory, useDeleteCategory } from '../hooks/useApi';

/**
 * Kelola Kategori (Prompt 13).
 *
 * Kategori bawaan milik sistem (tidak bisa dihapus), kategori sendiri milik
 * Pengguna. Tambah dan hapus berlaku langsung ke server — tidak ada tombol
 * "Simpan" besar karena tiap perubahan hanya satu baris.
 */
export function KategoriPage() {
  const { user } = useAuth();
  const { data: categories, isLoading, error } = useCategories(user?.id);
  const createCategory = useCreateCategory(user?.id);
  const deleteCategory = useDeleteCategory(user?.id);

  const [draft, setDraft] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const bawaan = (categories ?? []).filter((category) => category.isDefault);
  const milikSaya = (categories ?? []).filter((category) => !category.isDefault);

  async function tambah() {
    setFormError(null);
    const name = draft.trim();

    if (!name) {
      return;
    }

    if (
      (categories ?? []).some((category) => category.name.toLowerCase() === name.toLowerCase())
    ) {
      setFormError('Kategori itu sudah ada.');
      return;
    }

    try {
      await createCategory.mutateAsync(name);
      setDraft('');
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Gagal menambah kategori.');
    }
  }

  return (
    <div className="app-shell">
      <AppBar title="Kategori" back />

      <div className="screen screen--no-nav">
        <p className="caption" style={{ marginBottom: 'var(--space-4)' }}>
          Kategori bawaan bisa langsung dipakai, atau tambah sendiri.
        </p>

        {error || formError ? (
          <div className="alert alert--danger" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
            <IconAlert size={16} />
            <span>
              {formError ?? (error instanceof Error ? error.message : 'Gagal memuat kategori.')}
            </span>
          </div>
        ) : null}

        <section className="section">
          <h2 className="section__title" style={{ marginBottom: 'var(--space-3)' }}>
            Bawaan
          </h2>

          <div
            className="row"
            style={{ flexWrap: 'wrap', justifyContent: 'flex-start', gap: 'var(--space-2)' }}
          >
            {bawaan.map((category) => (
              <span key={category.id} className="chip chip--muted" title="Kategori bawaan">
                {category.name}
              </span>
            ))}
            {bawaan.length === 0 ? <p className="caption">Belum ada kategori bawaan.</p> : null}
          </div>
        </section>

        <section className="section">
          <h2 className="section__title" style={{ marginBottom: 'var(--space-3)' }}>
            Kategori kamu
          </h2>

          {isLoading ? (
            <p className="caption">Memuat kategori…</p>
          ) : milikSaya.length === 0 ? (
            <p className="caption">Belum ada kategori sendiri. Tambahkan di bawah.</p>
          ) : (
            <div className="list__card">
              {milikSaya.map((category) => (
                <div key={category.id} className="list__row">
                  <span className="list__body">
                    <span className="list__title">{category.name}</span>
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Hapus kategori ${category.name}`}
                    disabled={deleteCategory.isPending}
                    onClick={() => void deleteCategory.mutateAsync(category.id)}
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <div className="row" style={{ gap: 'var(--space-2)' }}>
            <input
              className="field__input"
              style={{ flex: 1 }}
              placeholder="Tambah kategori"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void tambah();
                }
              }}
            />
            <button
              type="button"
              className="button button--primary button--auto"
              disabled={createCategory.isPending}
              onClick={() => void tambah()}
            >
              <IconPlus size={18} />
              Tambah
            </button>
          </div>
        </section>

        <p className="muted-note">
          Kategori bawaan tidak bisa dihapus supaya laporan lama tetap terbaca. Kategori sendiri
          bisa dihapus kapan saja.
        </p>
      </div>
    </div>
  );
}
