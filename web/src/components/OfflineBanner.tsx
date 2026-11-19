import { IconCloudOff } from './Icons';

/** Pita offline — dipasang tepat di bawah top app bar. */
export function OfflineBanner() {
  return (
    <div className="offline-banner" role="status">
      <IconCloudOff size={18} />
      <span>Kamu sedang offline. Pengeluaran baru akan disimpan dan dikirim saat online.</span>
    </div>
  );
}
