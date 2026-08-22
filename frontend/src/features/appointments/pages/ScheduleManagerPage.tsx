import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSchedules } from '../api';
import { ScheduleModal } from '../components/ScheduleModal';
import type { DoctorSchedule } from '../types';

export function ScheduleManagerPage(): JSX.Element {
  const { user } = useAuth();
  const branchId = user?.current_branch?.id ?? user?.home_branch?.id ?? null;
  const { data: schedules = [], isLoading, error } = useSchedules(
    branchId === null ? undefined : { branch_id: String(branchId) },
  );
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<DoctorSchedule | null>(null);

  const handleNewSchedule = () => {
    setEditingSchedule(null);
    setModalOpen(true);
  };

  const handleEditSchedule = (schedule: DoctorSchedule) => {
    setEditingSchedule(schedule);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Schedule Manager</h1>
          <p className="text-xs text-stone-500">Configure doctor schedules, time blocks, and availability.</p>
        </div>
        <button
          type="button"
          onClick={handleNewSchedule}
          disabled={branchId === null}
          className="btn-primary text-sm"
        >
          + New Schedule
        </button>
      </div>

      {branchId === null && (
        <div role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Select an active branch before creating or managing schedules.
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40">
          Failed to load schedules.
        </div>
      )}

      {/* Schedules List */}
      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500 dark:border-stone-800 dark:bg-stone-900/60">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">Doctor</th>
              <th scope="col" className="px-4 py-2 font-medium">Schedule Name</th>
              <th scope="col" className="px-4 py-2 font-medium">Validity</th>
              <th scope="col" className="px-4 py-2 font-medium">Duration/Concurrency</th>
              <th scope="col" className="px-4 py-2 font-medium">Status</th>
              <th scope="col" className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-stone-500">
                  <span className="animate-pulse">Loading schedules…</span>
                </td>
              </tr>
            )}
            {!isLoading && schedules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-stone-500">
                  No active schedules found for this branch.
                </td>
              </tr>
            )}
            {schedules.map((schedule) => (
              <tr key={schedule.id} className="hover:bg-stone-50 dark:hover:bg-stone-900/40">
                <td className="px-4 py-3 font-medium text-on-surface">
                  Dr. {schedule.doctor?.name ?? 'Unknown'}
                </td>
                <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                  {schedule.name}
                </td>
                <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                  {schedule.valid_from} to {schedule.valid_until ?? 'Indefinite'}
                </td>
                <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                  {schedule.slot_duration} min / max {schedule.max_concurrent}
                </td>
                <td className="px-4 py-3">
                  {schedule.is_active ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-200">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleEditSchedule(schedule)}
                    className="text-xs font-bold text-teal-600 hover:underline dark:text-teal-400"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {branchId !== null && <ScheduleModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        schedule={editingSchedule}
        branchId={branchId}
      />
      }
    </div>
  );
}
