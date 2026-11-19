import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft } from './Icons';

interface AppBarProps {
  title: string;
  /** Menampilkan chevron kembali. */
  back?: boolean;
  /** Tujuan tombol kembali; default kembali ke riwayat sebelumnya. */
  backTo?: string;
  /** Aksi teks di kanan, mis. "Simpan". */
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
  };
  /** Konten bebas di kanan (mis. ikon). */
  trailing?: ReactNode;
  /** Judul rata kiri — dipakai layar utama tanpa tombol kembali. */
  titleLeft?: boolean;
}

export function AppBar({
  title,
  back = false,
  backTo,
  action,
  trailing,
  titleLeft = false,
}: AppBarProps) {
  const navigate = useNavigate();

  return (
    <header className="app-bar">
      {back ? (
        <button
          type="button"
          className="icon-button"
          aria-label="Kembali"
          onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        >
          <IconChevronLeft size={22} />
        </button>
      ) : null}

      <h1 className={`app-bar__title${titleLeft ? ' app-bar__title--left' : ''}`}>{title}</h1>

      {action ? (
        <button
          type="button"
          className={`app-bar__action${action.danger ? ' app-bar__action--danger' : ''}`}
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </button>
      ) : (
        trailing
      )}
    </header>
  );
}
