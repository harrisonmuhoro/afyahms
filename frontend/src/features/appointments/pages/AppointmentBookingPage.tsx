import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoctorSelector } from '../components/booking/DoctorSelector';
import { AppointmentTypeSelect } from '../components/booking/AppointmentTypeSelect';
import type { AppointmentTypeValue } from '../components/booking/AppointmentTypeSelect';
import { PatientSearch } from '../components/booking/PatientSearch';
import { SlotPicker } from '../components/SlotPicker';
import { BookingConfirmModal } from '../components/booking/BookingConfirmModal';
import { useBookAppointment } from '../hooks/useBookAppointment';
import { useSchedules } from '../api';

interface SelectedPatient {
  id: string;
  full_name: string;
  patient_number: string;
}

interface SelectedDoctor {
  id: string;
  name: string;
}

// TODO: Replace with real branch context hook
const BRANCH_ID = (window as any).__BRANCH_ID__ ?? 'default-branch-id';

export function AppointmentBookingPage(): JSX.Element {
  const navigate = useNavigate();
  const { mutateAsync: bookAppointment, isPending, error: bookingError } = useBookAppointment();

  const [patient,     setPatient]     = useState<SelectedPatient | null>(null);
  const [doctor,      setDoctor]      = useState<SelectedDoctor | null>(null);
  const [apptDate,    setApptDate]    = useState('');
  const [apptType,    setApptType]    = useState<AppointmentTypeValue | ''>('');
  const [selectedSlot,setSelectedSlot]= useState<{ start: string; end: string } | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [notes,       setNotes]       = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Fetch schedules to get schedule_id for the selected doctor
  const { data: schedules = [] } = useSchedules(
    doctor ? { doctor_id: doctor.id, branch_id: BRANCH_ID } : undefined,
  );
  const scheduleId = schedules[0]?.id ?? '';

  const canProceed =
    !!patient && !!doctor && !!apptDate && !!apptType && !!selectedSlot && !!scheduleId;

  const handleBook = async () => {
    if (!patient || !doctor || !apptDate || !apptType || !selectedSlot || !scheduleId) return;
    try {
      const apt = await bookAppointment({
        patient_id:       patient.id,
        doctor_id:        doctor.id,
        branch_id:        BRANCH_ID,
        schedule_id:      scheduleId,
        type:             apptType,
        appointment_date: apptDate,
        start_time:       selectedSlot.start,
        end_time:         selectedSlot.end,
        chief_complaint:  chiefComplaint || undefined,
        notes:            notes || undefined,
        booked_via:       'staff',
      });
      setShowConfirm(false);
      navigate(`/appointments/${apt.id}`);
    } catch {
      // error displayed via bookingError
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      {/* Page header */}
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
          <h1 className="text-xl font-semibold text-on-surface">Book Appointment</h1>
          <p className="text-xs text-on-surface-variant">Fill in the details below to schedule a new appointment.</p>
        </div>
      </div>

      {/* Form card */}
      <div className="card divide-y divide-outline-variant/30">
        {/* Patient */}
        <Section title="Patient" icon="person">
          <PatientSearch
            value={patient}
            onChange={(p) => setPatient(p as SelectedPatient)}
            required
          />
        </Section>

        {/* Doctor & date */}
        <Section title="Doctor &amp; Schedule" icon="stethoscope">
          <div className="grid gap-4 sm:grid-cols-2">
            <DoctorSelector
              branchId={BRANCH_ID}
              value={doctor?.id ?? ''}
              onChange={(id, d) => {
                setDoctor({ id, name: d.name });
                setSelectedSlot(null);
              }}
              required
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="appt-date" className="text-xs font-medium text-on-surface-variant">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="appt-date"
                type="date"
                min={new Date().toISOString().substring(0, 10)}
                value={apptDate}
                onChange={(e) => { setApptDate(e.target.value); setSelectedSlot(null); }}
                className="input"
              />
            </div>
          </div>
        </Section>

        {/* Slot picker */}
        <Section title="Available Slots" icon="schedule">
          {!doctor || !apptDate ? (
            <p className="rounded-lg bg-surface-container/60 py-4 text-center text-sm text-on-surface-variant">
              Select a doctor and date to see available slots.
            </p>
          ) : (
            <SlotPicker
              doctorId={doctor.id}
              branchId={BRANCH_ID}
              date={apptDate}
              selectedStartTime={selectedSlot?.start}
              onSelectSlot={(start, end) => setSelectedSlot({ start, end })}
            />
          )}
        </Section>

        {/* Appointment type */}
        <Section title="Appointment Details" icon="category">
          <div className="space-y-4">
            <AppointmentTypeSelect
              value={apptType}
              onChange={setApptType}
              required
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="chief-complaint" className="text-xs font-medium text-on-surface-variant">
                Chief Complaint
              </label>
              <input
                id="chief-complaint"
                type="text"
                placeholder="e.g. Chest pain, headache…"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="booking-notes" className="text-xs font-medium text-on-surface-variant">
                Notes (staff only)
              </label>
              <textarea
                id="booking-notes"
                rows={2}
                placeholder="Additional notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input resize-none"
              />
            </div>
          </div>
        </Section>

        {/* Error */}
        {bookingError && (
          <div className="px-6 py-3">
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {(bookingError as any)?.message ?? 'Failed to book appointment. Please try again.'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Cancel
          </button>
          <button
            id="review-booking-btn"
            type="button"
            disabled={!canProceed}
            onClick={() => setShowConfirm(true)}
            className="btn-primary text-sm disabled:opacity-50"
          >
            Review &amp; Confirm
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      <BookingConfirmModal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => void handleBook()}
        isSubmitting={isPending}
        patient={patient}
        doctor={doctor}
        slot={selectedSlot ? { start_time: selectedSlot.start, end_time: selectedSlot.end, status: 'available' } : null}
        appointmentDate={apptDate}
        appointmentType={apptType}
        chiefComplaint={chiefComplaint}
        notes={notes}
      />
    </div>
  );
}

/* Local section wrapper */
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
        <h2 className="text-sm font-semibold text-on-surface" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      {children}
    </div>
  );
}
