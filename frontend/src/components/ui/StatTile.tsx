import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Tone } from './Badge';

const ICON_TONES: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-ink-secondary',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

interface StatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  to?: string;
  loading?: boolean;
  className?: string;
}

/** Compact operational figure. Deliberately modest — numbers support decisions, they are not the page. */
export function StatTile({ label, value, hint, icon: IconCmp, tone = 'neutral', to, loading = false, className }: StatTileProps): JSX.Element {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-ink-secondary">{label}</span>
        {IconCmp !== undefined && (
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-md', ICON_TONES[tone])}>
            <IconCmp aria-hidden size={15} strokeWidth={1.9} />
          </span>
        )}
      </div>
      <div className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-ink">
        {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-surface-sunken align-middle" /> : value}
      </div>
      {hint !== undefined && <div className="mt-0.5 text-xs text-ink-muted">{hint}</div>}
    </>
  );
  const base = cn('block rounded-xl border border-line bg-surface p-4', className);
  return to !== undefined ? (
    <Link to={to} className={cn(base, 'transition-colors hover:border-line-strong hover:bg-surface-muted/40')}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}
