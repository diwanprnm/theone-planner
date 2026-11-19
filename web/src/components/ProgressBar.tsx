import { budgetTone, usagePercent } from '../lib/format';

interface ProgressBarProps {
  spent: number | string;
  budget: number | string;
  thin?: boolean;
  /** Sembunyikan label persentase. */
  showLabel?: boolean;
}

/**
 * Bilah anggaran: hijau di bawah 80%, kuning 80–100%, merah di atas 100%.
 * Warna TIDAK berdiri sendiri — label persentasenya selalu menemani.
 */
export function ProgressBar({ spent, budget, thin = false, showLabel = false }: ProgressBarProps) {
  const percent = usagePercent(spent, budget);
  const tone = budgetTone(spent, budget);
  const toneClass = tone === 'ok' ? '' : ` progress__fill--${tone}`;

  return (
    <div>
      <div
        className={`progress${thin ? ' progress--thin' : ''}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${percent}% dari anggaran terpakai`}
      >
        <div className={`progress__fill${toneClass}`} style={{ width: `${percent}%` }} />
      </div>
      {showLabel ? <p className="caption" style={{ marginTop: 8 }}>{percent}% terpakai</p> : null}
    </div>
  );
}
