import { useEffect, useMemo, useState } from 'react';
import {
  useBranchHolidays,
  useRemoveBranchHoliday,
  useRemoveScheduleOverride,
  useSaveBranchHoliday,
  useSaveScheduleOverride,
} from '../api';
import type { DoctorSchedule } from '../types';

interface ScheduleExceptionsPanelProps {
  branchId: number;
  schedules: DoctorSchedule[];
}

const today = (): string => new Date().toISOString().slice(0, 10);

export function ScheduleExceptionsPanel({ branchId, schedules }: ScheduleExceptionsPanelProps): JSX.Element {
  const { data: holidays = [], isLoading: holidaysLoading } = useBranchHolidays(branchId);
  const saveHoliday = useSaveBranchHoliday();
  const removeHoliday = useRemoveBranchHoliday();
  const saveOverride = useSaveScheduleOverride();
  const removeOverride = useRemoveScheduleOverride();

  const [holidayDate, setHolidayDate] = useState(today());
  const [holidayName, setHolidayName] = useState('');
  const [scheduleId, setScheduleId] = useState(schedules[0]?.id ?? '');
  const [overrideDate, setOverrideDate] = useState(today());
  const [overrideType, setOverrideType] = useState<'unavailable' | 'extra'>('unavailable');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!scheduleId && schedules[0]) setScheduleId(schedules[0].id);
  }, [scheduleId, schedules]);

  const selectedSchedule = useMemo(
    () => schedules.find((schedule) => schedule.id === scheduleId),
    [scheduleId, schedules],
  );

  const submitHoliday = async (): Promise<void> => {
    if (!holidayDate || !holidayName.trim()) return;
    await saveHoliday.mutateAsync({ branch_id: branchId, holiday_date: holidayDate, name: holidayName.trim() });
    setHolidayName('');
    setFeedback('Public holiday saved.');
  };

  const submitOverride = async (): Promise<void> => {
    if (!scheduleId || !overrideDate || (overrideType === 'extra' && (!startTime || !endTime))) return;
    if ((startTime && !endTime) || (!startTime && endTime)) {
      setFeedback('Provide both start and end times, or leave both blank for a full-day closure.');
      return;
    }

    const result = await saveOverride.mutateAsync({
      scheduleId,
      data: {
        override_date: overrideDate,
        type: overrideType,
        start_time: startTime || null,
        end_time: endTime || null,
        reason: reason.trim() || undefined,
      },
    });
    setFeedback(
      result.manual_review_required
        ? 'Override saved. ' + result.conflicts.length + ' appointment(s) flagged for manual review.'
        : 'Schedule override saved.',
    );
    setStartTime('');
    setEndTime('');
    setReason('');
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold text-on-surface">Public holidays</h2>
          <p className="text-xs text-on-surface-variant">Holiday dates block appointment slots for this branch.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]">
          <input aria-label="Holiday date" type="date" min={today()} value={holidayDate} onChange={(event) => setHolidayDate(event.target.value)} className="input" />
          <input aria-label="Holiday name" placeholder="Holiday name" value={holidayName} onChange={(event) => setHolidayName(event.target.value)} className="input" />
          <button type="button" onClick={() => void submitHoliday()} disabled={saveHoliday.isPending || !holidayName.trim()} className="btn-primary whitespace-nowrap">Add holiday</button>
        </div>
        <div className="divide-y divide-outline-variant/30 rounded-lg border border-outline-variant/50">
          {holidaysLoading && <p className="p-3 text-sm text-on-surface-variant">Loading holidays…</p>}
          {!holidaysLoading && holidays.length === 0 && <p className="p-3 text-sm text-on-surface-variant">No public holidays configured.</p>}
          {holidays.map((holiday) => (
            <div key={holiday.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-medium text-on-surface">{holiday.name}</p>
                <p className="text-xs text-on-surface-variant">{holiday.holiday_date}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Remove ' + holiday.name + '?')) void removeHoliday.mutateAsync(holiday.id);
                }}
                className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold text-on-surface">Schedule overrides</h2>
          <p className="text-xs text-on-surface-variant">Add leave, closures, or extra availability for a specific doctor schedule.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <select aria-label="Schedule" value={scheduleId} onChange={(event) => setScheduleId(event.target.value)} className="input sm:col-span-2">
            <option value="">Select a schedule</option>
            {schedules.map((schedule) => <option key={schedule.id} value={schedule.id}>Dr. {schedule.doctor?.name ?? 'Unknown'} — {schedule.name}</option>)}
          </select>
          <input aria-label="Override date" type="date" min={today()} value={overrideDate} onChange={(event) => setOverrideDate(event.target.value)} className="input" />
          <select aria-label="Override type" value={overrideType} onChange={(event) => setOverrideType(event.target.value as 'unavailable' | 'extra')} className="input">
            <option value="unavailable">Unavailable / leave</option>
            <option value="extra">Extra availability</option>
          </select>
          <input aria-label="Override start time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className="input" />
          <input aria-label="Override end time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="input" />
          <input aria-label="Override reason" placeholder="Reason (optional)" value={reason} onChange={(event) => setReason(event.target.value)} className="input sm:col-span-2" />
        </div>
        <p className="text-[11px] text-on-surface-variant">Leave start/end blank for a full-day unavailable override.</p>
        <button type="button" onClick={() => void submitOverride()} disabled={saveOverride.isPending || !selectedSchedule || !scheduleId} className="btn-primary">Save override</button>
        {selectedSchedule && (
          <div className="divide-y divide-outline-variant/30 rounded-lg border border-outline-variant/50">
            {(selectedSchedule.overrides ?? []).length === 0 && <p className="p-3 text-sm text-on-surface-variant">No overrides configured for this schedule.</p>}
            {(selectedSchedule.overrides ?? []).map((override) => (
              <div key={override.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-medium text-on-surface">{override.override_date} · {override.type === 'extra' ? 'Extra availability' : 'Unavailable'}</p>
                  <p className="text-xs text-on-surface-variant">
                    {override.start_time && override.end_time ? override.start_time.slice(0, 5) + '–' + override.end_time.slice(0, 5) : 'Full day'}
                    {override.reason ? ' · ' + override.reason : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Remove override for ' + override.override_date + '?')) {
                      void removeOverride.mutateAsync({ scheduleId: selectedSchedule.id, date: override.override_date });
                    }
                  }}
                  className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        {feedback && <p role="status" className="rounded-md bg-teal-50 px-3 py-2 text-sm text-teal-800 dark:bg-teal-950/30 dark:text-teal-200">{feedback}</p>}
      </section>
    </div>
  );
}
