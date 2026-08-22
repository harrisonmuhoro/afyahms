import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { useAppointments } from '../hooks/useAppointments';
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge';


export function AppointmentsCalendarPage(): JSX.Element {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { appointments, isLoading } = useAppointments({ from: today, per_page: 100 });

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

      <div className="card flex items-center gap-3 p-4">
        <span className="material-symbols-outlined text-primary">calendar_month</span>
        <div>
          <p className="text-base font-semibold text-on-surface">Upcoming appointments</p>
          <p className="text-xs text-on-surface-variant">Showing appointments from today onward, in date and time order.</p>
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
            {appointments.map((apt) => {
              const appointmentDate = new Date(`${apt.appointment_date}T00:00:00`);
              const isToday = apt.appointment_date === today;

              return (
              <div
                key={apt.id}
                className="flex items-center justify-between gap-4 p-4 hover:bg-surface-container/50 transition-colors"
              >
                <div className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl border ${
                  isToday
                    ? 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                    : 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wide">{format(appointmentDate, 'EEE')}</span>
                  <span className="text-2xl font-black leading-tight">{format(appointmentDate, 'd')}</span>
                  <span className="text-[10px] font-semibold uppercase">{format(appointmentDate, 'MMM')}</span>
                </div>
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
                    {(apt as any).patient?.full_name ?? (apt as any).patient?.name ?? 'Unknown Patient'}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {format(new Date(`${apt.appointment_date}T00:00:00`), 'EEE, MMM d')} ·{' '}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
