import { useMemo } from 'react';
import { eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth, startOfWeek } from 'date-fns';
import type { Appointment } from '../../types';
import { AppointmentCard } from './AppointmentCard';

interface MonthViewProps {
  currentDate: Date;
  appointments: Appointment[];
  isLoading: boolean;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export function MonthView({ currentDate, appointments, isLoading, onAppointmentClick }: MonthViewProps): JSX.Element {
  const firstDay = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
  const lastDay = eachDayOfInterval({ start: firstDay, end: endOfMonth(currentDate) });
  while (lastDay.length % 7 !== 0) lastDay.push(new Date(lastDay[lastDay.length - 1].getTime() + 86400000));

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((appointment) => {
      const key = appointment.appointment_date;
      const list = map.get(key) ?? [];
      list.push(appointment);
      map.set(key, list.sort((a, b) => a.start_time.localeCompare(b.start_time)));
    });
    return map;
  }, [appointments]);

  if (isLoading) return <div className="h-[520px] animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />;

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface dark:bg-stone-900">
      <div className="grid min-w-[840px] grid-cols-7">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="border-b border-outline-variant/40 px-2 py-2 text-center text-[11px] font-semibold uppercase text-on-surface-variant">{day}</div>
        ))}
        {lastDay.map((day) => {
          const dayAppointments = byDay.get(format(day, 'yyyy-MM-dd')) ?? [];
          const inMonth = day.getMonth() === currentDate.getMonth();
          return (
            <div key={day.toISOString()} className={["min-h-[120px] border-b border-r border-outline-variant/20 p-2", !inMonth ? 'opacity-40' : '', isSameDay(day, new Date()) ? 'bg-primary/5' : ''].join(' ')}>
              <div className="mb-1 text-xs font-semibold text-on-surface-variant">{format(day, 'd')}</div>
              <div className="space-y-1">
                {dayAppointments.slice(0, 4).map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} onClick={onAppointmentClick} compact />)}
                {dayAppointments.length > 4 && <p className="px-1 text-[10px] text-on-surface-variant">+{dayAppointments.length - 4} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
