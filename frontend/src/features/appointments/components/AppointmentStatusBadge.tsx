import type { AppointmentStatus } from '../types';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled:   { label: 'Scheduled',   className: 'rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-200' },
  confirmed:   { label: 'Confirmed',   className: 'rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-950/40 dark:text-blue-200' },
  checked_in:  { label: 'Checked In',  className: 'rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-200' },
  in_progress: { label: 'In Progress', className: 'rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-200' },
  completed:   { label: 'Completed',   className: 'rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-700 dark:bg-stone-700 dark:text-stone-200' },
  cancelled:   { label: 'Cancelled',   className: 'rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200' },
  rescheduled: { label: 'Rescheduled', className: 'rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800 dark:bg-orange-950/40 dark:text-orange-200' },
  no_show:     { label: 'No-show',     className: 'rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200' },
};

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export function AppointmentStatusBadge({ status, className = '' }: AppointmentStatusBadgeProps): JSX.Element {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'rounded-full bg-stone-200 px-2 py-0.5 text-[11px] text-stone-600' };
  return (
    <span className={`${config.className} ${className}`}>
      {config.label}
    </span>
  );
}
