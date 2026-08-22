interface NoShowAlertBannerProps {
  noShowCount: number;
  patientName: string;
}

/**
 * Displayed on the booking/detail page when a patient has a history of no-shows.
 * Surfaces a warning so reception staff can take proactive steps (e.g. call ahead).
 */
export function NoShowAlertBanner({ noShowCount, patientName }: NoShowAlertBannerProps): JSX.Element | null {
  if (noShowCount < 2) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700/50 dark:bg-amber-950/30"
    >
      <span className="material-symbols-outlined mt-0.5 text-[20px] text-amber-600 dark:text-amber-400 shrink-0">
        warning
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
          Repeat No-Show Risk
        </p>
        <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-400">
          {patientName} has missed <strong>{noShowCount}</strong> previous appointment
          {noShowCount !== 1 ? 's' : ''} without cancelling. Consider calling ahead to confirm
          attendance before the visit.
        </p>
      </div>
    </div>
  );
}
