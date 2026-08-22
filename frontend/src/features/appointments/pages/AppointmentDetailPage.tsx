import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { format, parse } from 'date-fns';
import { useAppointment } from '../hooks/useAppointments';
import { useCancelAppointment } from '../hooks/useCancelAppointment';
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge';
import { AppointmentActionsMenu } from '../components/AppointmentActionsMenu';
import { NoShowAlertBanner } from '../components/NoShowAlertBanner';
import { useConfirmAppointment, useCheckInPatient } from '../api';


function formatTime(t: string): string {
  try { return format(parse(t, 'HH:mm:ss', new Date()), 'h:mm a'); }
  catch { return t.substring(0, 5); }
}

function formatDate(d: string): string {
  try { return format(new Date(d + 'T00:00:00'), 'EEEE, MMMM d, yyyy'); }
  catch { return d; }
}

const TYPE_LABELS: Record<string, string> = {
  new_patient:         'New Patient',
  follow_up:           'Follow-up',
  procedure:           'Procedure',
  anc:                 'Antenatal (ANC)',
  immunization:        'Immunization',
  lab_radiology:       'Lab / Radiology',
  specialist_referral: 'Specialist Referral',
};

const BOOKED_VIA_LABELS: Record<string, string> = {
  staff:          'Staff',
  patient_portal: 'Patient Portal',
  walk_in:        'Walk-in',
};

export function AppointmentDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { appointment, isLoading, error, refetch } = useAppointment(id);
  const { mutateAsync: cancelAppt, isPending: cancelling } = useCancelAppointment();
  const { mutateAsync: confirmAppt } = useConfirmAppointment();
  const { mutateAsync: checkIn } = useCheckInPatient();

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!id) return;
    await confirmAppt(Number(id));
    refetch();
  };

  const handleCheckIn = async () => {
    if (!id) return;
    await checkIn(Number(id));
    refetch();
  };

  const handleCancel = async () => {
    if (!id || !cancelReason.trim()) return;
    await cancelAppt({ id, reason: cancelReason });
    setShowCancelDialog(false);
    refetch();
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 py-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">event_busy</span>
        <p className="text-sm text-on-surface-variant">Appointment not found or you don't have access.</p>
        <Link to="/appointments" className="btn-primary text-sm">
          Back to Appointments
        </Link>
      </div>
    );
  }

  const patient    = (appointment as any).patient;
  const doctor     = (appointment as any).doctor;
  const noShowCount = patient?.no_show_count ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container transition-colors"
            aria-label="Go back"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-on-surface">Appointment Details</h1>
              <AppointmentStatusBadge status={appointment.status} />
            </div>
            <p className="font-mono text-xs text-on-surface-variant">#{appointment.appointment_number}</p>
          </div>
        </div>

        <AppointmentActionsMenu
          appointmentId={appointment.id}
          status={appointment.status}
          onConfirm={() => void handleConfirm()}
          onCheckIn={() => void handleCheckIn()}
          onCancel={() => setShowCancelDialog(true)}
          onReschedule={() => navigate(`/appointments/${appointment.id}/reschedule`)}
        />
      </div>

      {/* No-show risk banner */}
      {patient && (
        <NoShowAlertBanner
          noShowCount={noShowCount}
          patientName={patient.full_name ?? patient.name ?? 'This patient'}
        />
      )}

      {/* Details card */}
      <div className="card divide-y divide-outline-variant/30">
        {/* Patient */}
        <DetailRow icon="person" label="Patient">
          {patient ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-on-surface">
                  {patient.full_name ?? patient.name}
                </p>
                <p className="font-mono text-xs text-on-surface-variant">
                  {patient.patient_number}
                  {patient.phone && <> · {patient.phone}</>}
                </p>
              </div>
              <Link
                to={`/patients/${patient.id}`}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                View Profile →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">{appointment.patient_id}</p>
          )}
        </DetailRow>

        {/* Doctor */}
        {doctor && (
          <DetailRow icon="stethoscope" label="Doctor">
            <p className="font-medium text-on-surface">Dr. {doctor.name}</p>
            {doctor.specialization && (
              <p className="text-xs text-on-surface-variant capitalize">{doctor.specialization}</p>
            )}
          </DetailRow>
        )}

        {/* Date & Time */}
        <DetailRow icon="calendar_today" label="Date &amp; Time">
          <p className="font-medium text-on-surface">{formatDate(appointment.appointment_date)}</p>
          <p className="font-mono text-sm text-primary">
            {formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}
          </p>
        </DetailRow>

        {/* Type */}
        <DetailRow icon="category" label="Type">
          <p className="text-on-surface">{TYPE_LABELS[appointment.type] ?? appointment.type}</p>
        </DetailRow>

        {/* Chief complaint */}
        {appointment.chief_complaint && (
          <DetailRow icon="description" label="Chief Complaint">
            <p className="text-on-surface">{appointment.chief_complaint}</p>
          </DetailRow>
        )}

        {/* Notes */}
        {appointment.notes && (
          <DetailRow icon="notes" label="Notes">
            <p className="text-sm text-on-surface-variant">{appointment.notes}</p>
          </DetailRow>
        )}

        {/* Booked via */}
        <DetailRow icon="send" label="Booked Via">
          <p className="text-on-surface">{BOOKED_VIA_LABELS[appointment.booked_via] ?? appointment.booked_via}</p>
        </DetailRow>

        {/* Cancellation info */}
        {appointment.status === 'cancelled' && (
          <DetailRow icon="cancel" label="Cancellation Reason">
            <p className="text-sm text-red-700 dark:text-red-400">
              {(appointment as any).cancellation_reason ?? '—'}
            </p>
          </DetailRow>
        )}
      </div>

      {/* Cancel dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCancelDialog(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-surface p-6 shadow-2xl dark:bg-stone-900 space-y-4">
            <h2 className="text-base font-semibold text-on-surface">Cancel Appointment</h2>
            <p className="text-sm text-on-surface-variant">
              Please provide a reason for cancellation. This will be visible to branch admins.
            </p>
            <textarea
              id="cancel-reason"
              rows={3}
              placeholder="Reason for cancellation…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="input w-full resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCancelDialog(false)}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Back
              </button>
              <button
                id="confirm-cancel-btn"
                type="button"
                disabled={!cancelReason.trim() || cancelling}
                onClick={() => void handleCancel()}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {cancelling && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-6 py-4">
      <span className="material-symbols-outlined mt-0.5 text-[18px] text-on-surface-variant shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-on-surface-variant/70"
           dangerouslySetInnerHTML={{ __html: label }} />
        {children}
      </div>
    </div>
  );
}
