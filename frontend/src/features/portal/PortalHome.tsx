import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { Icon } from '@/components/icons/Icon';
import { Link } from 'react-router-dom';
import { PortalModal, ConfirmDialog, ToastBanner } from './PortalModal';

export function PortalHome(): JSX.Element {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.name.split(' ')[0] ?? 'Patient';

  const [modal, setModal] = useState<'reschedule' | 'cancel' | 'pay' | null>(null);
  const [phone, setPhone] = useState('0712 345 678');
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [apptCancelled, setApptCancelled] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('2026-07-05');
  const [rescheduleTime, setRescheduleTime] = useState('10:00');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success'): void => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePay = (): void => {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setModal(null);
      showToast(`M-Pesa prompt sent to ${phone}. Enter your PIN to complete.`, 'info');
    }, 2000);
  };

  const handleReschedule = (): void => {
    setModal(null);
    showToast(`Appointment rescheduled to ${rescheduleDate} at ${rescheduleTime}.`);
  };

  const handleCancelAppt = (): void => {
    setApptCancelled(true);
    showToast('Appointment cancelled successfully.', 'info');
  };

  return (
    <div className="animate-fade-in space-y-6 sm:space-y-8">

      {/* Toast */}
      {toast && <ToastBanner message={toast.msg} type={toast.type} />}

      {/* Welcome Header */}
      <section>
        <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 sm:text-4xl">
          Welcome, {firstName}
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Here is a summary of your recent health activity.
        </p>
      </section>

      {/* Dashboard Grid */}
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">

        {/* Next Appointment */}
        {!apptCancelled && (
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
              <button
                type="button"
                onClick={() => setModal('reschedule')}
                className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              >
                Reschedule
              </button>
              <button
                type="button"
                onClick={() => setModal('cancel')}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-stone-700 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Outstanding Bill */}
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
          <button
            type="button"
            onClick={() => setModal('pay')}
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700"
          >
            Pay with M-Pesa
          </button>
        </div>

        {/* New Results */}
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
            <button
              type="button"
              onClick={() => navigate('/portal/results')}
              className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-stone-700 shadow-sm border border-stone-200 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
            >
              View
            </button>
          </div>
        </div>

        {/* My Prescriptions */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-stone-900 dark:text-stone-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                <Icon name="pharmacy" size={20} />
              </div>
              <h2 className="text-lg font-bold">My prescriptions</h2>
            </div>
            <Link to="/portal/records" className="text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">
              See all
            </Link>
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

      </div>

      {/* Quick Actions */}
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

      {/* ── Modals ────────────────────────────────────────────────────── */}

      {/* Reschedule Modal */}
      <PortalModal isOpen={modal === 'reschedule'} onClose={() => setModal(null)} title="Reschedule Appointment">
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Current: <span className="font-semibold text-stone-700 dark:text-stone-300">25 Jun · 10:00 AM — Dr. Mwangi (Cardiology)</span>
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">New Date</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Preferred Time</label>
            <select
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
            >
              {['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300">
            Cancel
          </button>
          <button type="button" onClick={handleReschedule} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700">
            Confirm Reschedule
          </button>
        </div>
      </PortalModal>

      {/* Cancel Confirmation */}
      <ConfirmDialog
        isOpen={modal === 'cancel'}
        onClose={() => setModal(null)}
        onConfirm={handleCancelAppt}
        title="Cancel Appointment"
        message="Are you sure you want to cancel your appointment with Dr. Mwangi on 25 Jun at 10:00 AM? This action cannot be undone."
        confirmLabel="Yes, Cancel Appointment"
        danger
      />

      {/* M-Pesa Payment Modal */}
      <PortalModal isOpen={modal === 'pay'} onClose={() => !paying && setModal(null)} title="Pay with M-Pesa">
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Amount: <span className="text-lg font-black text-stone-900 dark:text-stone-100">KES 1,320.00</span>
        </p>
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">M-Pesa Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XX XXX XXX"
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
          />
          <p className="mt-1.5 text-xs text-stone-400">You will receive an STK push prompt on this number.</p>
        </div>
        <button
          type="button"
          onClick={handlePay}
          disabled={paying || phone.trim().length < 9}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
        >
          {paying ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Sending M-Pesa prompt…
            </>
          ) : (
            <>
              <Icon name="payments" size={18} />
              Send M-Pesa Prompt
            </>
          )}
        </button>
      </PortalModal>

    </div>
  );
}
