import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCreateSchedule, useUpdateSchedule } from '../api';
import type { DoctorSchedule, TimeBlock } from '../types';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule?: DoctorSchedule | null;
  branchId: number;
}

const DAYS_OF_WEEK = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const localToday = (): string => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

export function ScheduleModal({ isOpen, onClose, schedule, branchId }: ScheduleModalProps) {
  const { user } = useAuth();
  const createMutation = useCreateSchedule();
  const updateMutation = useUpdateSchedule();
  
  const isDoctorOnly = user?.roles.includes('doctor') && !user?.roles.includes('superadmin') && !user?.roles.includes('hospital-admin');

  const [formData, setFormData] = useState({
    name: 'General Clinic Hours',
    doctor_id: isDoctorOnly ? String(user?.id) : '',
    slot_duration: 15,
    max_concurrent: 1,
    valid_from: localToday(),
    valid_until: '',
    is_active: true,
  });

  const [timeBlocks, setTimeBlocks] = useState<Partial<TimeBlock>[]>([
    { day_of_week: 1, start_time: '09:00', end_time: '17:00' }
  ]);

  useEffect(() => {
    if (isOpen) {
      if (schedule) {
        setFormData({
          name: schedule.name,
          doctor_id: schedule.doctor_id,
          slot_duration: schedule.slot_duration,
          max_concurrent: schedule.max_concurrent,
          valid_from: schedule.valid_from,
          valid_until: schedule.valid_until || '',
          is_active: schedule.is_active,
        });
        
        if (schedule.time_blocks && schedule.time_blocks.length > 0) {
          setTimeBlocks(schedule.time_blocks.map(tb => ({
            id: tb.id,
            day_of_week: tb.day_of_week,
            start_time: tb.start_time.substring(0, 5),
            end_time: tb.end_time.substring(0, 5),
          })));
        } else {
          setTimeBlocks([]);
        }
      } else {
        setFormData({
          name: 'General Clinic Hours',
          doctor_id: isDoctorOnly ? String(user?.id) : '',
          slot_duration: 15,
          max_concurrent: 1,
          valid_from: localToday(),
          valid_until: '',
          is_active: true,
        });
        setTimeBlocks([{ day_of_week: 1, start_time: '09:00', end_time: '17:00' }]);
      }
    }
  }, [isOpen, schedule, isDoctorOnly, user]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.name || !formData.doctor_id || !formData.valid_from) {
      alert("Please fill all required fields.");
      return;
    }

    if (formData.valid_from < localToday()) {
      alert('Valid From must be today or a future date.');
      return;
    }

    if (formData.valid_until && formData.valid_until < formData.valid_from) {
      alert('Valid Until must be on or after Valid From.');
      return;
    }

    for (const block of timeBlocks) {
      if (block.end_time && block.end_time > '18:00') {
        alert(`End time cannot exceed 18:00. Please fix the schedule for ${DAYS_OF_WEEK[block.day_of_week!]}.`);
        return;
      }
    }

    const payload = {
      branch_id: Number(branchId),
      doctor_id: Number(formData.doctor_id),
      name: formData.name,
      slot_duration: formData.slot_duration,
      max_concurrent: formData.max_concurrent,
      valid_from: formData.valid_from,
      valid_until: formData.valid_until || null,
      is_active: formData.is_active,
      time_blocks: timeBlocks.map(tb => ({
        day_of_week: Number(tb.day_of_week),
        start_time: tb.start_time?.length === 5 ? `${tb.start_time}:00` : tb.start_time || '',
        end_time: tb.end_time?.length === 5 ? `${tb.end_time}:00` : tb.end_time || '',
      }))
    };

    try {
      if (schedule) {
        await updateMutation.mutateAsync({ id: Number(schedule.id), data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save schedule');
    }
  };

  const addTimeBlock = () => {
    setTimeBlocks([...timeBlocks, { day_of_week: 1, start_time: '09:00', end_time: '17:00' }]);
  };

  const updateTimeBlock = (index: number, field: string, value: any) => {
    const newBlocks = [...timeBlocks];
    (newBlocks[index] as any)[field] = value;
    setTimeBlocks(newBlocks);
  };

  const removeTimeBlock = (index: number) => {
    setTimeBlocks(timeBlocks.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 dark:bg-black/60">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-stone-900">
        
        <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 dark:border-stone-800">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            {schedule ? 'Edit Schedule' : 'New Schedule'}
          </h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-semibold">Schedule Name *</label>
              <input 
                type="text" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-stone-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800"
              />
            </div>

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-semibold">Doctor ID *</label>
              <input 
                type="text" 
                value={formData.doctor_id} 
                disabled={isDoctorOnly}
                onChange={e => setFormData({ ...formData, doctor_id: e.target.value })}
                placeholder="User ID of the doctor"
                className="w-full rounded-xl border border-stone-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 disabled:opacity-60"
              />
              {isDoctorOnly && <p className="text-xs text-stone-500 mt-1">Locked to your account.</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Slot Duration (mins) *</label>
              <input 
                type="number" min="5" max="120"
                value={formData.slot_duration} 
                onChange={e => setFormData({ ...formData, slot_duration: parseInt(e.target.value) || 15 })}
                className="w-full rounded-xl border border-stone-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Max Concurrent *</label>
              <input 
                type="number" min="1"
                value={formData.max_concurrent} 
                onChange={e => setFormData({ ...formData, max_concurrent: parseInt(e.target.value) || 1 })}
                className="w-full rounded-xl border border-stone-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Valid From *</label>
              <input 
                type="date" 
                value={formData.valid_from} 
                min={localToday()}
                onChange={e => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full rounded-xl border border-stone-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold">Valid Until</label>
              <input 
                type="date" 
                value={formData.valid_until} 
                min={formData.valid_from || localToday()}
                onChange={e => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full rounded-xl border border-stone-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Time Blocks (Max 18:00)</h3>
              <button 
                type="button" 
                onClick={addTimeBlock}
                className="text-xs font-bold text-teal-600 hover:underline dark:text-teal-400"
              >
                + Add Block
              </button>
            </div>
            
            <div className="space-y-3">
              {timeBlocks.length === 0 && (
                <p className="text-sm text-stone-500 italic">No time blocks added. Doctor will have no available slots.</p>
              )}
              {timeBlocks.map((block, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50">
                  <select
                    value={block.day_of_week}
                    onChange={e => updateTimeBlock(idx, 'day_of_week', parseInt(e.target.value))}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-800"
                  >
                    {DAYS_OF_WEEK.map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>
                  
                  <input 
                    type="time" 
                    value={block.start_time}
                    onChange={e => updateTimeBlock(idx, 'start_time', e.target.value)}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800"
                  />
                  <span>to</span>
                  <input 
                    type="time" 
                    max="18:00"
                    value={block.end_time}
                    onChange={e => updateTimeBlock(idx, 'end_time', e.target.value)}
                    className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800"
                  />
                  
                  <button type="button" onClick={() => removeTimeBlock(idx)} className="ml-auto text-red-500 hover:text-red-700 font-bold">
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
             <input 
                type="checkbox" 
                id="is_active"
                checked={formData.is_active} 
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="is_active" className="text-sm font-semibold">Schedule is Active</label>
          </div>
        </div>

        <div className="border-t border-stone-200 bg-stone-50 px-6 py-4 flex justify-end gap-3 dark:border-stone-800 dark:bg-stone-900/50">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800">
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
