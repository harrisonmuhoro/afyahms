import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';
import { Link } from 'react-router-dom';

export function PortalHome(): JSX.Element {
  const { user } = useAuth();
  
  // In a real implementation, we would fetch these from the API.
  // For the MVP, we use hardcoded examples per the UI/UX spec.
  const hasAppointment = true;
  const hasBill = true;
  const hasResults = true;
  const hasPrescriptions = true;

  const firstName = user?.name.split(' ')[0] ?? 'Patient';

  return (
    <div className="animate-fade-in space-y-6 sm:space-y-8">
      {/* ── Welcome Header ───────────────────────────────────────────── */}
      <section>
        <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 sm:text-4xl">
          Welcome, {firstName}
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Here is a summary of your recent health activity.
        </p>
      </section>

      {/* ── Dashboard Grid ────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
        
        {/* Next Appointment */}
        {hasAppointment && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="mb-4 flex items-center gap-3 text-stone-900 dark:text-stone-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400">
                <Icon name="calendar" size={20} />
              </div>
              <h2 className="text-lg font-bold">Next appointment</h2>
            </div>
            
            <div className="mb-5 rounded-xl bg-stone-50 p-4 dark:bg-stone-800/50">
              <p className="font-medium text-stone-900 dark:text-stone-100">25 Jun · 10:00 AM</p>
              <p className="text-sm text-stone-500 dark:text-stone-400">Dr. Mwangi (Cardiology)</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button type="button" className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700">
                Reschedule
              </button>
              <button type="button" className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Outstanding Bill */}
        {hasBill && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="mb-4 flex items-center gap-3 text-stone-900 dark:text-stone-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                <Icon name="billing" size={20} />
              </div>
              <h2 className="text-lg font-bold">Outstanding bill</h2>
            </div>
            
            <div className="mb-5 flex items-end justify-between rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Amount Due</p>
                <p className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">KES 1,320.00</p>
              </div>
            </div>
            
            <button type="button" className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700">
              Pay with M-Pesa
            </button>
          </div>
        )}

        {/* New Results */}
        {hasResults && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-stone-900 dark:text-stone-100">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                  <Icon name="laboratory" size={20} />
                </div>
                <h2 className="text-lg font-bold">New results (1)</h2>
              </div>
              <Link to="/portal/results" className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
                See all
              </Link>
            </div>
            
            <div className="flex items-center justify-between rounded-xl bg-stone-50 p-4 dark:bg-stone-800/50">
              <div>
                <p className="font-medium text-stone-900 dark:text-stone-100">Complete Blood Count (CBC)</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">22 Jun</p>
              </div>
              <button className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm border border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700">
                View
              </button>
            </div>
          </div>
        )}

        {/* My Prescriptions */}
        {hasPrescriptions && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-stone-900 dark:text-stone-100">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                  <Icon name="pharmacy" size={20} />
                </div>
                <h2 className="text-lg font-bold">My prescriptions</h2>
              </div>
            </div>
            
            <div className="rounded-xl border border-stone-200 p-4 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100">Amoxicillin 500mg</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">1 pill · 3 times a day</p>
                </div>
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Active
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <section className="pt-4">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Quick Actions
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            to="/portal/appointments"
            className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-4 text-center font-bold text-white transition-colors hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600"
          >
            <Icon name="plus" size={20} />
            Book appointment
          </Link>
          <Link
            to="/portal/messages"
            className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-4 text-center font-bold text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <Icon name="message" size={20} />
            Message care team
          </Link>
          <Link
            to="/portal/records"
            className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-4 text-center font-bold text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <Icon name="download" size={20} />
            Download records
          </Link>
        </div>
      </section>

    </div>
  );
}
