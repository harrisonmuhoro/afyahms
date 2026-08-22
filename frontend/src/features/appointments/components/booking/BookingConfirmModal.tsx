import { format, parse } from 'date-fns';
import type { AvailableSlot } from '../../types';
import { APPOINTMENT_TYPES } from './AppointmentTypeSelect';

interface BookingConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  patient: { id: string; full_name: string; patient_number: string } | null;
  doctor: { id: string; name: string } | null;
  slot: AvailableSlot | null;
  appointmentDate: string;
  appointmentType: string;
  chiefComplaint: string;
  notes: string;
}

function formatTime(time: string): string {
  try {
    return format(parse(time, 'HH:mm:ss', new Date()), 'h:mm a');
  } catch {
    return time.substring(0, 5);
  }
}

function getTypeLabel(value: string): string {
  return APPOINTMENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function BookingConfirmModal({
  open,
  onClose,
  onConfirm,
  isSubmitting,
  patient,
  doctor,
  slot,
  appointmentDate,
  appointmentType,
  chiefComplaint,
  notes,
}: BookingConfirmModalProps): JSX.Element | null {
  if (!open) return null;

  const formattedDate = appointmentDate
    ? format(new Date(appointmentDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')
    : '—';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-confirm-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl bg-surface shadow-2xl dark:bg-stone-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <span className="material-symbols-outlined text-[20px] text-primary">event_available</span>
            </div>
            <h2 id="booking-confirm-title" className="text-base font-semibold text-on-surface">
              Confirm Booking
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container transition-colors"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="divide-y divide-outline-variant/30 px-6 py-2">
          <Row icon="person" label="Patient">
            <p className="font-medium text-on-surface">{patient?.full_name ?? '—'}</p>
            <p className="font-mono text-[11px] text-on-surface-variant">{patient?.patient_number}</p>
          </Row>

          <Row icon="stethoscope" label="Doctor">
            <p className="text-on-surface">{doctor ? `Dr. ${doctor.name}` : '—'}</p>
          </Row>

          <Row icon="calendar_today" label="Date &amp; Time">
            <p className="text-on-surface">{formattedDate}</p>
            {slot && (
              <p className="font-mono text-sm text-primary">
                {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
              </p>
            )}
          </Row>

          <Row icon="category" label="Type">
            <p className="text-on-surface capitalize">{getTypeLabel(appointmentType)}</p>
          </Row>

          {chiefComplaint && (
            <Row icon="description" label="Chief Complaint">
              <p className="text-on-surface">{chiefComplaint}</p>
            </Row>
          )}

          {notes && (
            <Row icon="notes" label="Notes">
              <p className="text-on-surface-variant text-xs">{notes}</p>
            </Row>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-outline-variant/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
          >
            Back
          </button>
          <button
            id="confirm-booking-btn"
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
          >
            {isSubmitting && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isSubmitting ? 'Booking…' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Small helper row component */
function Row({
  icon,
  label,
  children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="material-symbols-outlined mt-0.5 text-[18px] text-on-surface-variant shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-on-surface-variant/70">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}
