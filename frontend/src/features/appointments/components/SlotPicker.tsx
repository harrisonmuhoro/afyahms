import { format, parse } from 'date-fns';
import { useAvailableSlots } from '../hooks/useAvailableSlots';

interface SlotPickerProps {
  doctorId: string;
  branchId: string;
  scheduleId?: string;
  date: string; // YYYY-MM-DD
  onSelectSlot: (startTime: string, endTime: string) => void;
  selectedStartTime?: string;
  slotsEndpoint?: string;
}

export function SlotPicker({ doctorId, branchId, scheduleId, date, onSelectSlot, selectedStartTime, slotsEndpoint }: SlotPickerProps): JSX.Element {
  const { slots, isLoading, error } = useAvailableSlots(
    { doctor_id: doctorId, branch_id: branchId, schedule_id: scheduleId, date },
    !!doctorId && !!branchId && !!date,
    slotsEndpoint,
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-md bg-stone-100 dark:bg-stone-800 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !slots) {
    return <p className="text-sm text-error">Failed to load available slots. Please try again.</p>;
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-md border-2 border-dashed border-outline-variant p-6 text-center text-sm text-on-surface-variant">
        No slots available for this date.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {slots.map((slot: any) => {
        const isSelected = selectedStartTime === slot.start_time;
        const isFull = slot.status === 'full';
        // Format "09:00:00" → "9:00 AM"
        const displayTime = format(parse(slot.start_time, 'HH:mm:ss', new Date()), 'h:mm a');

        return (
          <button
            key={slot.start_time}
            type="button"
            disabled={isFull}
            onClick={() => !isFull && onSelectSlot(slot.start_time, slot.end_time)}
            className={[
              'rounded-md px-2 py-2 text-sm font-medium transition-colors',
              isFull
                ? 'cursor-not-allowed bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500'
                : isSelected
                  ? 'bg-primary text-on-primary ring-2 ring-primary ring-offset-2'
                  : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-primary-container/20 hover:text-primary',
            ].join(' ')}
          >
            {displayTime}
          </button>
        );
      })}
    </div>
  );
}
