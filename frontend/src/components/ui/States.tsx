import type { ReactNode } from 'react';
import { AlertTriangle, Inbox, RefreshCw, type LucideIcon } from 'lucide-react';
import { HttpError } from '@/lib/http';
import { cn } from '@/lib/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function EmptyState({ icon: IconCmp = Inbox, title, description, action, compact = false, className }: EmptyStateProps): JSX.Element {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-6' : 'px-6 py-12', className)}>
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
        <IconCmp aria-hidden size={20} strokeWidth={1.75} />
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description !== undefined && <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{description}</p>}
      {action !== undefined && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Turns API failures into language a clinician or clerk can act on. */
export function friendlyError(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.status === 0) return 'We could not reach the server. Check your connection and try again.';
    if (error.status === 401) return 'Your session has ended. Please sign in again.';
    if (error.status === 403) return 'Your role does not have access to this information.';
    if (error.status === 404) return 'This record could not be found. It may have been moved or removed.';
    if (error.status === 422) return error.message || 'Some details need correcting before this can be saved.';
    if (error.status >= 500) return 'The system had a problem completing this request. Try again in a moment.';
    return error.message;
  }
  return 'Something went wrong while loading this information.';
}

interface ErrorStateProps {
  title?: string;
  error?: unknown;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Unable to load', error, description, onRetry, className }: ErrorStateProps): JSX.Element {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center px-6 py-10 text-center', className)}>
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle aria-hidden size={20} strokeWidth={1.75} />
      </span>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{description ?? friendlyError(error)}</p>
      {onRetry !== undefined && (
        <button type="button" onClick={onRetry} className="btn-secondary btn-sm mt-4">
          <RefreshCw aria-hidden size={14} /> Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }): JSX.Element {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-surface-sunken', className)} />;
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }): JSX.Element {
  return (
    <div role="status" aria-label="Loading" className={cn('divide-y divide-line', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}
