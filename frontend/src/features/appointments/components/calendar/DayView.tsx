import { useMemo } from 'react';
import { format } from 'date-fns';
import type { Appointment } from '../../types';
import { AppointmentCard } from './AppointmentCard';

interface DayViewProps {
  date: Date;
  appointments: Appointment[];
  isLoading: boolean;
  onAppointmentClick?: (appointment: Appointment) => void;
}

// Working hours to display on the timeline
const HOUR_START = 7;  // 07:00
const HOUR_END   = 19; // 19:00
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesFromStart(t: string): number {
  return Math.max(0, timeToMinutes(t) - HOUR_START * 60);
}

const TOTAL_MINUTES = (HOUR_END - HOUR_START) * 60;
const PX_PER_MINUTE = 3; // 3px per minute → 1 hour = 180px

export function DayView({ appointments, isLoading, onAppointmentClick }: DayViewProps): JSX.Element {
  const sorted = useMemo(
    () => [...appointments].sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [appointments],
  );

  const totalHeight = TOTAL_MINUTES * PX_PER_MINUTE;

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative flex overflow-hidden rounded-xl border border-outline-variant bg-surface dark:bg-stone-900">
      {/* Hour labels */}
      <div className="shrink-0 select-none border-r border-outline-variant/40 bg-surface-container/30 dark:bg-stone-950/40">
        <div style={{ height: totalHeight }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              style={{ height: 60 * PX_PER_MINUTE }}
              className="flex items-start px-3 pt-1"
            >
              <span className="font-mono text-[11px] text-on-surface-variant/60 whitespace-nowrap">
                {format(new Date().setHours(hour, 0), 'h a')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid + events */}
      <div className="relative flex-1 overflow-x-auto">
        {/* Hour grid lines */}
        <div style={{ height: totalHeight }} className="relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              style={{ top: (hour - HOUR_START) * 60 * PX_PER_MINUTE }}
              className="absolute left-0 right-0 border-t border-outline-variant/20"
            />
          ))}

          {/* Current time indicator */}
          <CurrentTimeIndicator hourStart={HOUR_START} hourEnd={HOUR_END} pxPerMinute={PX_PER_MINUTE} />

          {/* Appointment blocks */}
          {sorted.map((apt) => {
            const topPx    = minutesFromStart(apt.start_time) * PX_PER_MINUTE;
            const duration = timeToMinutes(apt.end_time) - timeToMinutes(apt.start_time);
            const heightPx = Math.max(duration * PX_PER_MINUTE, 28);

            return (
              <div
                key={apt.id}
                style={{ top: topPx, height: heightPx, left: 8, right: 8 }}
                className="absolute"
              >
                <AppointmentCard
                  appointment={apt}
                  onClick={onAppointmentClick}
                  compact={heightPx < 55}
                />
              </div>
            );
          })}

          {!isLoading && sorted.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-on-surface-variant/50">
              No appointments scheduled
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentTimeIndicator({
  hourStart,
  hourEnd,
  pxPerMinute,
}: {
  hourStart: number;
  hourEnd: number;
  pxPerMinute: number;
}): JSX.Element | null {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = hourStart * 60;
  const endMinutes = hourEnd * 60;

  if (currentMinutes < startMinutes || currentMinutes > endMinutes) return null;

  const topPx = (currentMinutes - startMinutes) * pxPerMinute;

  return (
    <div
      style={{ top: topPx }}
      className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
    >
      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
      <div className="h-px flex-1 bg-red-500" />
    </div>
  );
}
