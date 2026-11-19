import type { ReactNode } from 'react';
import { IconReceipt } from './Icons';

interface EmptyStateProps {
  title: string;
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Ganti ilustrasi bawaan bila perlu. */
  illustration?: ReactNode;
}

export function EmptyState({
  title,
  hint,
  actionLabel,
  onAction,
  illustration,
}: EmptyStateProps) {
  return (
    <div className="empty">
      <div style={{ color: 'var(--color-text-muted)' }}>
        {illustration ?? <IconReceipt size={56} />}
      </div>
      <p className="empty__title">{title}</p>
      <p className="empty__hint">{hint}</p>
      {actionLabel && onAction ? (
        <button type="button" className="button button--primary empty__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
