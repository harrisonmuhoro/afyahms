import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Glyph } from '@/components/icons/Glyph';

export type CalendarViewMode = 'day' | 'week' | 'month';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
}: CalendarHeaderProps): JSX.Element {
  const isToday = format(currentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const title =
    viewMode === 'day'
      ? format(currentDate, 'EEEE, MMMM d, yyyy')
      : viewMode === 'week'
        ? `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} – ${format(
          endOfWeek(currentDate, { weekStartsOn: 1 }),
          'MMM d, yyyy',
        )}`
        : format(currentDate, 'MMMM yyyy');

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface p-3 dark:bg-stone-900">
      {/* Left: date title */}
      <div className="flex items-center gap-3">
        <Glyph name="calendar_month" size={22} className="text-primary" />
        <div>
          <p className="text-sm font-semibold text-on-surface">{title}</p>
          {isToday && viewMode === 'day' && (
            <p className="text-[11px] font-medium text-primary">Today</p>
          )}
        </div>
      </div>

      {/* Right: nav + view switcher */}
      <div className="flex items-center gap-2">
        {/* View mode toggle */}
        <div
          role="group"
          aria-label="Calendar view"
          className="flex rounded-lg border border-outline-variant overflow-hidden text-xs font-medium"
        >
          {(['day', 'week', 'month'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={[
                'px-3 py-1.5 capitalize transition-colors',
                viewMode === mode
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container',
              ].join(' ')}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous"
            className="rounded-lg border border-outline-variant p-1.5 text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <Glyph name="chevron_left" size={18} />
          </button>
          <button
            type="button"
            onClick={onToday}
            disabled={isToday}
            className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next"
            className="rounded-lg border border-outline-variant p-1.5 text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <Glyph name="chevron_right" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
