import { format, parse } from 'date-fns';
import type { Appointment } from '../../types';
import { AppointmentStatusBadge } from '../AppointmentStatusBadge';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick?: (appointment: Appointment) => void;
  compact?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  new_patient:         'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30',
  follow_up:           'border-l-teal-500 bg-teal-50 dark:bg-teal-950/30',
  procedure:           'border-l-purple-500 bg-purple-50 dark:bg-purple-950/30',
  anc:                 'border-l-pink-500 bg-pink-50 dark:bg-pink-950/30',
  immunization:        'border-l-green-500 bg-green-50 dark:bg-green-950/30',
  lab_radiology:       'border-l-amber-500 bg-amber-50 dark:bg-amber-950/30',
  specialist_referral: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/30',
};

function formatTime(t: string): string {
  try { return format(parse(t, 'HH:mm:ss', new Date()), 'h:mm a'); }
  catch { return t.substring(0, 5); }
}

export function AppointmentCard({ appointment, onClick, compact = false }: AppointmentCardProps): JSX.Element {
  const colorClass = TYPE_COLORS[appointment.type] ?? 'border-l-stone-400 bg-stone-50 dark:bg-stone-900/40';
  const patientName = (appointment as any).patient?.name ?? (appointment as any).patient?.full_name ?? 'Unknown Patient';
  const doctorName  = (appointment as any).doctor?.name;

  return (
    <button
      type="button"
      onClick={() => onClick?.(appointment)}
      className={[
        'w-full rounded-lg border-l-4 px-3 py-2 text-left transition-all hover:shadow-md active:scale-[0.99]',
        colorClass,
        compact ? 'space-y-0.5' : 'space-y-1',
      ].join(' ')}
    >
      {/* Time row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold text-on-surface-variant">
          {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
        </span>
        <AppointmentStatusBadge status={appointment.status} />
      </div>

      {/* Patient name */}
      <p className="truncate text-sm font-semibold text-on-surface">{patientName}</p>

      {!compact && (
        <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
          <span className="capitalize">{appointment.type.replace(/_/g, ' ')}</span>
          {doctorName && (
            <>
              <span>·</span>
              <span>Dr. {doctorName}</span>
            </>
          )}
        </div>
      )}

      {appointment.appointment_number && (
        <p className="font-mono text-[10px] text-on-surface-variant/60">
          #{appointment.appointment_number}
        </p>
      )}
    </button>
  );
}
