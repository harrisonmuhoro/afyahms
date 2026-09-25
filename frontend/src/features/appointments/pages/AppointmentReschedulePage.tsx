import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppointment } from '../hooks/useAppointments';
import { useRescheduleAppointment } from '../hooks/useRescheduleAppointment';
import { SlotPicker } from '../components/SlotPicker';

export function AppointmentReschedulePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { appointment, isLoading } = useAppointment(id);
  const { mutateAsync, isPending, error } = useRescheduleAppointment();
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState<{ start: string; end: string } | null>(null);

  if (isLoading) return <div className="py-12 text-center text-sm text-on-surface-variant">Loading appointment…</div>;
  if (!appointment || !id || !appointment.schedule_id) {
    return <div className="py-12 text-center text-sm text-error">This appointment cannot be rescheduled.</div>;
  }

  const scheduleId = appointment.schedule_id;

  const handleSubmit = async (): Promise<void> => {
    if (!date || !slot) return;
    await mutateAsync({
      id,
      appointment_date: date,
      start_time: slot.start,
      end_time: slot.end,
      schedule_id: scheduleId,
    });
    navigate(`/appointments/${id}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-16">
      <div>
        <h1 className="text-xl font-semibold text-on-surface">Reschedule Appointment</h1>
        <p className="text-xs text-on-surface-variant">Choose a new date and available time slot.</p>
      </div>

      <div className="card space-y-5 p-6">
        <div className="rounded-lg bg-surface-container/60 p-3 text-sm text-on-surface-variant">
          Current appointment: {appointment.appointment_date} at {appointment.start_time.substring(0, 5)}
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-on-surface-variant">
          New date
          <input
            type="date"
            min={new Date().toISOString().substring(0, 10)}
            value={date}
            onChange={(event) => { setDate(event.target.value); setSlot(null); }}
            className="input"
          />
        </label>

        {date && (
          <SlotPicker
            doctorId={String(appointment.doctor_id ?? '')}
            branchId={String(appointment.branch_id)}
            scheduleId={String(scheduleId)}
            date={date}
            selectedStartTime={slot?.start}
            onSelectSlot={(start, end) => setSlot({ start, end })}
          />
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Unable to reschedule this appointment.</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-lg border border-outline-variant px-4 py-2 text-sm">
            Cancel
          </button>
          <button type="button" disabled={!slot || isPending} onClick={() => void handleSubmit()} className="btn-primary text-sm disabled:opacity-50">
            {isPending ? 'Rescheduling…' : 'Confirm Reschedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
