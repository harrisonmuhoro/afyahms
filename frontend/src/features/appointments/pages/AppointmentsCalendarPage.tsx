import { useState } from 'react';
import { format, addDays } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { useAppointments } from '../api';
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge';
import type { Appointment } from '../types';

export function AppointmentsCalendarPage(): JSX.Element {
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigate = useNavigate();
  const dateStr = format(currentDate, 'yyyy-MM-dd');

  const { data, isLoading } = useAppointments({ date: dateStr });
  const appointments: Appointment[] = (data as any)?.data ?? [];

  const handlePrevDay = () => setCurrentDate((prev) => addDays(prev, -1));
  const handleNextDay = () => setCurrentDate((prev) => addDays(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Appointments</h1>
          <p className="text-xs text-stone-500">Manage patient appointments and schedules.</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/appointments/schedules"
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Manage Schedules
          </Link>
          <Link
            to="/appointments/book"
            className="btn-primary text-sm"
          >
            + Book Appointment
          </Link>
        </div>
      </div>

      {/* Date Navigator */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">calendar_month</span>
            <div>
              <p className="text-base font-semibold text-on-surface">
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
              </p>
              {!isToday && (
                <p className="text-xs text-on-surface-variant">
                  {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} scheduled
                </p>
              )}
              {isToday && (
                <p className="text-xs text-primary font-medium">Today</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevDay}
              className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container transition-colors"
              aria-label="Previous day"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={handleToday}
              disabled={isToday}
              className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:bg-surface-container transition-colors"
              aria-label="Next day"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Appointment list */}
      <div className="card">
        {isLoading && (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-md bg-stone-100 dark:bg-stone-800 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && appointments.length === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
              calendar_today
            </span>
            <p className="text-sm text-on-surface-variant">No appointments scheduled for this date.</p>
            <Link to="/appointments/book" className="btn-primary text-sm">
              + Book Appointment
            </Link>
          </div>
        )}

        {!isLoading && appointments.length > 0 && (
          <div className="divide-y divide-outline-variant/30">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between gap-4 p-4 hover:bg-surface-container/50 transition-colors"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-on-surface">
                      {apt.start_time?.substring(0, 5)} – {apt.end_time?.substring(0, 5)}
                    </span>
                    <AppointmentStatusBadge status={apt.status} />
                    {apt.appointment_number && (
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        #{apt.appointment_number}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-on-surface truncate">
                    {(apt as any).patient?.name ?? 'Unknown Patient'}
                  </p>
                  <p className="text-xs text-on-surface-variant capitalize">
                    {apt.type?.replace(/_/g, ' ')}
                    {(apt as any).doctor?.name && (
                      <> &middot; Dr. {(apt as any).doctor.name}</>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/appointments/${apt.id}`)}
                  className="shrink-0 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Details
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
