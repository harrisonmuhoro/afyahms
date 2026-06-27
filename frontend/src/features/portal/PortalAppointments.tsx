import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';

interface Appointment {
  id: string;
  date: string;
  time: string;
  provider: string;
  department: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
}

const APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-001',
    date: '25 Jun 2026',
    time: '10:00 AM',
    provider: 'Dr. Mwangi',
    department: 'Cardiology',
    status: 'upcoming',
    notes: 'Please arrive 15 minutes early for registration.',
  },
  {
    id: 'APT-002',
    date: '10 Jul 2026',
    time: '2:30 PM',
    provider: 'Dr. Otieno',
    department: 'General Practice',
    status: 'upcoming',
  },
  {
    id: 'APT-003',
    date: '12 Jun 2026',
    time: '9:00 AM',
    provider: 'Dr. Mwangi',
    department: 'Cardiology',
    status: 'completed',
  },
  {
    id: 'APT-004',
    date: '28 May 2026',
    time: '11:30 AM',
    provider: 'Dr. Achieng',
    department: 'Diabetology',
    status: 'completed',
  },
  {
    id: 'APT-005',
    date: '01 May 2026',
    time: '3:00 PM',
    provider: 'Dr. Kamau',
    department: 'Nutrition',
    status: 'cancelled',
  },
];

const STATUS_CONFIG = {
  upcoming: {
    label: 'Upcoming',
    classes: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  },
  completed: {
    label: 'Completed',
    classes: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  },
};

export function PortalAppointments(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const upcoming = APPOINTMENTS.filter((a) => a.status === 'upcoming');
  const past = APPOINTMENTS.filter((a) => a.status !== 'upcoming');

  const displayed = activeTab === 'upcoming' ? upcoming : past;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">
            Appointments
          </h1>
          <p className="mt-1 text-stone-500 dark:text-stone-400">
            View, reschedule, or book appointments with your care team.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white transition-colors hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600"
        >
          <Icon name="plus" size={18} />
          Book Appointment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-900">
        {(['upcoming', 'past'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold capitalize transition-all ${
              activeTab === tab
                ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100'
                : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300'
            }`}
          >
            {tab} ({tab === 'upcoming' ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      {/* Appointment Cards */}
      <div className="space-y-4">
        {displayed.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-stone-400 dark:border-stone-700 dark:bg-stone-900/30">
            <Icon name="calendar" size={40} className="mb-3 opacity-40" />
            <p className="text-sm">No {activeTab} appointments found.</p>
          </div>
        ) : (
          displayed.map((apt) => {
            const cfg = STATUS_CONFIG[apt.status];
            return (
              <div
                key={apt.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Date block */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                      <span className="text-xs font-bold uppercase leading-none">
                        {apt.date.split(' ')[1]}
                      </span>
                      <span className="text-2xl font-black leading-none">
                        {apt.date.split(' ')[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 dark:text-stone-100">
                        {apt.provider}
                      </p>
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        {apt.department} &middot; {apt.time}
                      </p>
                      {apt.notes && (
                        <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                          ⚠ {apt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status + Actions */}
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.classes}`}
                    >
                      {cfg.label}
                    </span>
                    {apt.status === 'upcoming' && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                        >
                          Reschedule
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-stone-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
