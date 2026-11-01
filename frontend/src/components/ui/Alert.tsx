import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/cn';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const STYLES: Record<AlertTone, { box: string; icon: typeof Info }> = {
  info: { box: 'border-info/25 bg-info-soft text-info', icon: Info },
  success: { box: 'border-success/25 bg-success-soft text-success', icon: CheckCircle2 },
  warning: { box: 'border-warning/30 bg-warning-soft text-warning', icon: AlertTriangle },
  danger: { box: 'border-danger/30 bg-danger-soft text-danger', icon: AlertCircle },
};

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Inline message for clinical warnings, validation summaries and confirmations. */
export function Alert({ tone = 'info', title, children, action, className }: AlertProps): JSX.Element {
  const { box, icon: IconCmp } = STYLES[tone];
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-lg border px-3.5 py-3', box, className)}>
      <IconCmp aria-hidden size={18} strokeWidth={1.9} className="mt-px shrink-0" />
      <div className="min-w-0 flex-1 text-sm">
        {title !== undefined && <p className="font-semibold">{title}</p>}
        {children !== undefined && <div className={cn('text-ink-secondary', title !== undefined && 'mt-0.5')}>{children}</div>}
      </div>
      {action !== undefined && <div className="shrink-0">{action}</div>}
    </div>
  );
}
