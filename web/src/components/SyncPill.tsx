import { useSync } from '../hooks/useSync';
import { IconCheck, IconCloudOff } from './Icons';

/**
 * Pil status sinkron: hijau "Tersinkron" atau kuning "N menunggu".
 * Bila ada yang menunggu, pil bisa ditekan untuk mengirim sekarang.
 */
export function SyncPill({ onClick }: { onClick?: () => void }) {
  const { pending, syncing } = useSync();

  if (pending === 0) {
    return (
      <span className="sync-pill sync-pill--ok">
        <IconCheck size={14} />
        Tersinkron
      </span>
    );
  }

  const label = syncing ? 'Mengirim…' : `${pending} menunggu`;

  if (!onClick) {
    return (
      <span className="sync-pill sync-pill--pending">
        <IconCloudOff size={14} />
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      className="sync-pill sync-pill--pending"
      onClick={onClick}
      style={{ border: 'none' }}
    >
      <IconCloudOff size={14} />
      {label}
    </button>
  );
}
