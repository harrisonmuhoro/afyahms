import { useMemo, useState } from 'react';
import { addDays, addMonths, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { useAppointments } from '../hooks/useAppointments';
import { CalendarHeader, type CalendarViewMode } from '../components/calendar/CalendarHeader';
import { DayView } from '../components/calendar/DayView';
import { WeekView } from '../components/calendar/WeekView';
import { MonthView } from '../components/calendar/MonthView';

export function AppointmentsCalendarPage(): JSX.Element {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('day');

  const range = useMemo(() => {
    const from = viewMode === 'day' ? currentDate : viewMode === 'week' ? startOfWeek(currentDate, { weekStartsOn: 1 }) : startOfMonth(currentDate);
    const to = viewMode === 'day' ? currentDate : viewMode === 'week' ? endOfWeek(currentDate, { weekStartsOn: 1 }) : endOfMonth(currentDate);
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') };
  }, [currentDate, viewMode]);

  const { appointments, isLoading } = useAppointments({ ...range, per_page: 100 });

  const move = (): void => setCurrentDate((date) => viewMode === 'day' ? addDays(date, 1) : viewMode === 'week' ? addDays(date, 7) : addMonths(date, 1));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Appointments</h1>
          <p className="text-xs text-stone-500">Manage patient appointments and schedules.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/appointments/schedules" className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container">
            Manage Schedules
          </Link>
          <Link to="/appointments/book" className="btn-primary text-sm">+ Book Appointment</Link>
        </div>
      </div>

      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrev={() => setCurrentDate((date) => viewMode === 'day' ? addDays(date, -1) : viewMode === 'week' ? addDays(date, -7) : addMonths(date, -1))}
        onNext={move}
        onToday={() => setCurrentDate(new Date())}
      />

      <div className="card p-3">
        {viewMode === 'day' ? (
          <DayView
            date={currentDate}
            appointments={appointments}
            isLoading={isLoading}
            onAppointmentClick={(appointment) => navigate(`/appointments/${appointment.id}`)}
          />
        ) : viewMode === 'week' ? (
          <WeekView
            currentDate={currentDate}
            appointments={appointments}
            isLoading={isLoading}
            onAppointmentClick={(appointment) => navigate(`/appointments/${appointment.id}`)}
          />
        ) : (
          <MonthView
            currentDate={currentDate}
            appointments={appointments}
            isLoading={isLoading}
            onAppointmentClick={(appointment) => navigate(`/appointments/${appointment.id}`)}
          />
        )}
      </div>
    </div>
  );
}
