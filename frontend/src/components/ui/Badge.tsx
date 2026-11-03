import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-ink-secondary ring-line',
  primary: 'bg-primary-soft text-primary ring-primary/20',
  success: 'bg-success-soft text-success ring-success/20',
  warning: 'bg-warning-soft text-warning ring-warning/25',
  danger: 'bg-danger-soft text-danger ring-danger/25',
  info: 'bg-info-soft text-info ring-info/20',
};

const DOTS: Record<Tone, string> = {
  neutral: 'bg-ink-muted',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

interface BadgeProps {
  tone?: Tone;
  /** Leading dot so status never relies on colour alone. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', dot = false, className, children }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {dot && <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', DOTS[tone])} />}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  // positive / done
  completed: 'success', complete: 'success', paid: 'success', active: 'success', available: 'success',
  normal: 'success', dispensed: 'success', verified: 'success', approved: 'success', discharged: 'success',
  checked_in: 'primary', confirmed: 'primary', in_progress: 'primary', in_consultation: 'primary',
  serving: 'primary', called: 'primary', scheduled: 'info', booked: 'info', processing: 'info', admitted: 'info',
  // waiting / attention
  pending: 'warning', waiting: 'warning', partially_paid: 'warning', partial: 'warning', on_hold: 'warning',
  held: 'warning', draft: 'warning', expiring: 'warning', low_stock: 'warning', submitted: 'warning',
  // problems
  overdue: 'danger', cancelled: 'danger', canceled: 'danger', rejected: 'danger', critical: 'danger',
  abnormal: 'danger', no_show: 'danger', expired: 'danger', out_of_stock: 'danger', void: 'danger', failed: 'danger',
};

/** Maps a backend status string (e.g. "partially_paid") to a semantic tone. */
export function statusTone(status: string | null | undefined): Tone {
  if (!status) return 'neutral';
  return STATUS_TONES[status.toLowerCase().replace(/[\s-]+/g, '_')] ?? 'neutral';
}

export function humanizeStatus(status: string): string {
  const text = status.replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }): JSX.Element {
  return (
    <Badge tone={statusTone(status)} dot className={className}>
      {status ? humanizeStatus(status) : 'Unknown'}
    </Badge>
  );
}
