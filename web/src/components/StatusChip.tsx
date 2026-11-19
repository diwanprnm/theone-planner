import { LABEL_STATUS } from '../lib/format';
import type { EventStatus } from '../lib/types';

const KELAS: Record<EventStatus, string> = {
  DRAFT: 'chip--draft',
  BERJALAN: 'chip--berjalan',
  SELESAI: 'chip--selesai',
};

/** Chip status Acara. Warnanya selalu disertai teks, tidak berdiri sendiri. */
export function StatusChip({ status }: { status: EventStatus }) {
  return <span className={`chip ${KELAS[status]}`}>{LABEL_STATUS[status] ?? status}</span>;
}
