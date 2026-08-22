import { useMemo } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import type { Appointment } from '../../types';
import { AppointmentCard } from './AppointmentCard';

interface WeekViewProps {
  currentDate: Date;
  appointments: Appointment[];
  isLoading: boolean;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export function WeekView({ currentDate, appointments, isLoading, onAppointmentClick }: WeekViewProps): JSX.Element {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday first
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    days.forEach((d) => map.set(format(d, 'yyyy-MM-dd'), []));
    appointments.forEach((apt) => {
      const key = apt.appointment_date;
      if (map.has(key)) map.get(key)!.push(apt);
    });
    // Sort each day's appointments by start time
    map.forEach((list) => list.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    return map;
  }, [appointments, days]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-1 rounded-xl border border-outline-variant overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-2 p-3">
            <div className="h-6 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
            <div className="h-12 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
            <div className="h-12 animate-pulse rounded bg-stone-100 dark:bg-stone-800" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface dark:bg-stone-900">
      <div className="grid min-w-[700px]" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))` }}>
        {/* Day headers */}
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={[
                'flex flex-col items-center border-b border-outline-variant/40 py-2 text-center',
                isToday ? 'bg-primary/5' : '',
              ].join(' ')}
            >
              <span className="text-[11px] font-medium uppercase text-on-surface-variant">
                {format(day, 'EEE')}
              </span>
              <span
                className={[
                  'mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
                  isToday
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface',
                ].join(' ')}
              >
                {format(day, 'd')}
              </span>
            </div>
          );
        })}

        {/* Appointment cells */}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayApts = byDay.get(key) ?? [];
          const isToday = isSameDay(day, today);

          return (
            <div
              key={key}
              className={[
                'min-h-[120px] space-y-1 border-r border-outline-variant/20 p-2 last:border-r-0',
                isToday ? 'bg-primary/5' : '',
              ].join(' ')}
            >
              {dayApts.length === 0 && (
                <p className="px-1 py-4 text-center text-[11px] text-on-surface-variant/40">—</p>
              )}
              {dayApts.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  appointment={apt}
                  onClick={onAppointmentClick}
                  compact
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
