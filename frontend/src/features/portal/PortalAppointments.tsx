import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { PortalModal, ConfirmDialog, ToastBanner } from './PortalModal';

interface Appointment {
  id: string;
  date: string;
  day: string;
  month: string;
  time: string;
  provider: string;
  department: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
}

const INITIAL_APPOINTMENTS: Appointment[] = [
  { id: 'APT-001', date: '25 Jun 2026', day: '25', month: 'Jun', time: '10:00 AM', provider: 'Dr. Mwangi', department: 'Cardiology', status: 'upcoming', notes: 'Please arrive 15 minutes early for registration.' },
  { id: 'APT-002', date: '10 Jul 2026', day: '10', month: 'Jul', time: '2:30 PM', provider: 'Dr. Otieno', department: 'General Practice', status: 'upcoming' },
  { id: 'APT-003', date: '12 Jun 2026', day: '12', month: 'Jun', time: '9:00 AM', provider: 'Dr. Mwangi', department: 'Cardiology', status: 'completed' },
  { id: 'APT-004', date: '28 May 2026', day: '28', month: 'May', time: '11:30 AM', provider: 'Dr. Achieng', department: 'Diabetology', status: 'completed' },
];

const PROVIDERS = ['Dr. Mwangi (Cardiology)', 'Dr. Otieno (General Practice)', 'Dr. Achieng (Diabetology)', 'Dr. Kamau (Nutrition)', 'Dr. Wanjiku (Dermatology)'];
const TIMES = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

const STATUS_CONFIG = {
  upcoming: { label: 'Upcoming', classes: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  completed: { label: 'Completed', classes: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

export function PortalAppointments(): JSX.Element {
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00 AM');
  const [bookProvider, setBookProvider] = useState(PROVIDERS[0]);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('10:00 AM');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'info' = 'success'): void => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCancel = (id: string): void => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a)),
    );
    showToast('Appointment cancelled.', 'info');
  };

  const handleReschedule = (): void => {
    if (!rescheduleTarget || !rescheduleDate) return;
    const d = new Date(rescheduleDate);
    const formatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === rescheduleTarget.id
          ? { ...a, date: formatted, day: String(d.getDate()).padStart(2, '0'), month: d.toLocaleDateString('en-GB', { month: 'short' }), time: rescheduleTime }
          : a,
      ),
    );
    setRescheduleTarget(null);
    showToast(`Appointment rescheduled to ${formatted} at ${rescheduleTime}.`);
  };

  const handleBook = (): void => {
    if (!bookDate) return;
    const d = new Date(bookDate);
    const formatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const [provName, dept] = bookProvider.split(' (');
    const newApt: Appointment = {
      id: `APT-${Date.now()}`,
      date: formatted,
      day: String(d.getDate()).padStart(2, '0'),
      month: d.toLocaleDateString('en-GB', { month: 'short' }),
      time: bookTime,
      provider: provName,
      department: dept?.replace(')', '') ?? '',
      status: 'upcoming',
    };
    setAppointments((prev) => [newApt, ...prev]);
    setBookingOpen(false);
    setActiveTab('upcoming');
    showToast(`Appointment booked with ${provName} on ${formatted}.`);
  };

  const upcoming = appointments.filter((a) => a.status === 'upcoming');
  const past = appointments.filter((a) => a.status !== 'upcoming');
  const displayed = activeTab === 'upcoming' ? upcoming : past;

  return (
    <div className="animate-fade-in space-y-6">
      {toast && <ToastBanner message={toast.msg} type={toast.type} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">Appointments</h1>
          <p className="mt-1 text-stone-500 dark:text-stone-400">View, reschedule, or book appointments with your care team.</p>
        </div>
        <button
          type="button"
          onClick={() => setBookingOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white transition-colors hover:bg-teal-700"
        >
          <Icon name="plus" size={18} />
          Book Appointment
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-900">
        {(['upcoming', 'past'] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold capitalize transition-all ${activeTab === tab ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100' : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'}`}
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
            <p className="text-sm">No {activeTab} appointments.</p>
            {activeTab === 'upcoming' && (
              <button type="button" onClick={() => setBookingOpen(true)} className="mt-3 text-sm font-semibold text-teal-600 hover:underline dark:text-teal-400">
                Book one now →
              </button>
            )}
          </div>
        ) : (
          displayed.map((apt) => {
            const cfg = STATUS_CONFIG[apt.status];
            return (
              <div key={apt.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                      <span className="text-xs font-bold uppercase leading-none">{apt.month}</span>
                      <span className="text-2xl font-black leading-none">{apt.day}</span>
                    </div>
                    <div>
                      <p className="font-bold text-stone-900 dark:text-stone-100">{apt.provider}</p>
                      <p className="text-sm text-stone-500 dark:text-stone-400">{apt.department} &middot; {apt.time}</p>
                      {apt.notes && <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">⚠ {apt.notes}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.classes}`}>{cfg.label}</span>
                    {apt.status === 'upcoming' && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setRescheduleTarget(apt); setRescheduleDate(''); }}
                          className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300">
                          Reschedule
                        </button>
                        <button type="button" onClick={() => setCancelTarget(apt.id)}
                          className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-stone-700 dark:text-red-400">
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

      {/* ── Modals ─── */}

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => { if (cancelTarget) handleCancel(cancelTarget); setCancelTarget(null); }}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This cannot be undone."
        confirmLabel="Yes, Cancel"
        danger
      />

      {/* Reschedule Modal */}
      <PortalModal isOpen={rescheduleTarget !== null} onClose={() => setRescheduleTarget(null)} title="Reschedule Appointment">
        {rescheduleTarget && (
          <>
            <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
              Current: <span className="font-semibold text-stone-700 dark:text-stone-300">{rescheduleTarget.date} · {rescheduleTarget.time} — {rescheduleTarget.provider}</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">New Date</label>
                <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">New Time</label>
                <select value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100">
                  {TIMES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setRescheduleTarget(null)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300">Cancel</button>
              <button type="button" onClick={handleReschedule} disabled={!rescheduleDate} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50">Confirm Reschedule</button>
            </div>
          </>
        )}
      </PortalModal>

      {/* Book Appointment Modal */}
      <PortalModal isOpen={bookingOpen} onClose={() => setBookingOpen(false)} title="Book New Appointment" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Provider / Department</label>
            <select value={bookProvider} onChange={(e) => setBookProvider(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100">
              {PROVIDERS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Preferred Date</label>
            <input type="date" value={bookDate} onChange={(e) => setBookDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Preferred Time</label>
            <select value={bookTime} onChange={(e) => setBookTime(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100">
              {TIMES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => setBookingOpen(false)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300">Cancel</button>
          <button type="button" onClick={handleBook} disabled={!bookDate} className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50">Confirm Booking</button>
        </div>
      </PortalModal>
    </div>
  );
}
