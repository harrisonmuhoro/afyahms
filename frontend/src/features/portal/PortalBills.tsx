import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { PortalModal, ToastBanner } from './PortalModal';
import { useAuth } from '@/features/auth/AuthProvider';

interface Invoice {
  id: string;
  date: string;
  services: string[];
  amount: number;
  paid: number;
  status: 'paid' | 'outstanding' | 'partial';
}

const INITIAL_INVOICES: Invoice[] = [];

const STATUS_CONFIG = {
  paid: { label: 'Paid', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  outstanding: { label: 'Outstanding', classes: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  partial: { label: 'Partial', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
};

export function PortalBills(): JSX.Element {
  const { hasPermission } = useAuth();
  const canPay = hasPermission('portal.pay');

  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [payModal, setPayModal] = useState<{ invoiceId: string | 'ALL'; amount: number } | null>(null);
  const [phone, setPhone] = useState('0712 345 678');
  const [paying, setPaying] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.amount - inv.paid), 0);

  const showToast = (msg: string, type: 'success' | 'info' = 'success'): void => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handlePay = (): void => {
    if (!payModal) return;
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      // Mark invoices as paid in local state
      setInvoices((prev) =>
        prev.map((inv) => {
          if (payModal.invoiceId === 'ALL' || inv.id === payModal.invoiceId) {
            return { ...inv, paid: inv.amount, status: 'paid' as const };
          }
          return inv;
        }),
      );
      setPayModal(null);
      showToast(`M-Pesa prompt sent to ${phone}. Enter your PIN to complete payment.`, 'info');
    }, 2000);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {toast && <ToastBanner message={toast.msg} type={toast.type} />}

      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">Bills & Pay</h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">View your invoices and settle outstanding bills via M-Pesa.</p>
      </div>

      {/* Account Summary Hero */}
      {totalOutstanding > 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-4 right-16 h-20 w-20 rounded-full bg-white/5" />
          <p className="text-sm font-medium text-teal-200">Total Outstanding Balance</p>
          <p className="mt-1 text-4xl font-black tracking-tight">KES {totalOutstanding.toLocaleString()}</p>
          <p className="mt-1 text-sm text-teal-300">Across {invoices.filter((i) => i.status !== 'paid').length} invoice(s)</p>
          {canPay && (
            <button
              type="button"
              onClick={() => setPayModal({ invoiceId: 'ALL', amount: totalOutstanding })}
              className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white shadow-md transition-all hover:bg-emerald-400"
            >
              <Icon name="payments" size={18} />
              Pay All with M-Pesa
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-900/20">
          <Icon name="check" size={24} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-bold text-emerald-800 dark:text-emerald-300">All paid up!</p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">You have no outstanding balances. Great job!</p>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Invoice History</h2>
        <div className="space-y-4">
          {invoices.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status];
            const outstanding = inv.amount - inv.paid;
            return (
              <div key={inv.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-stone-400 dark:text-stone-500">{inv.id}</p>
                    <p className="mt-0.5 font-bold text-stone-900 dark:text-stone-100">{inv.date}</p>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.classes}`}>{cfg.label}</span>
                </div>
                <ul className="mb-4 space-y-1">
                  {inv.services.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
                      {s}
                    </li>
                  ))}
                </ul>
                <div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500 dark:text-stone-400">Total</span>
                    <span className="font-semibold text-stone-700 dark:text-stone-300">KES {inv.amount.toLocaleString()}</span>
                  </div>
                  {inv.paid > 0 && (
                    <div className="mt-1 flex justify-between text-sm">
                      <span className="text-stone-500 dark:text-stone-400">Paid</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">– KES {inv.paid.toLocaleString()}</span>
                    </div>
                  )}
                  {outstanding > 0 && (
                    <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-sm dark:border-stone-700">
                      <span className="font-bold text-stone-700 dark:text-stone-300">Balance</span>
                      <span className="font-black text-red-600 dark:text-red-400">KES {outstanding.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                {outstanding > 0 && canPay && (
                  <button
                    type="button"
                    onClick={() => setPayModal({ invoiceId: inv.id, amount: outstanding })}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-600"
                  >
                    <Icon name="payments" size={18} />
                    Pay KES {outstanding.toLocaleString()} with M-Pesa
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── M-Pesa Payment Modal ── */}
      <PortalModal isOpen={payModal !== null} onClose={() => !paying && setPayModal(null)} title="Pay with M-Pesa">
        {payModal && (
          <>
            <div className="mb-5 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Amount to Pay</p>
              <p className="mt-0.5 text-3xl font-black text-emerald-700 dark:text-emerald-300">KES {payModal.amount.toLocaleString()}</p>
            </div>
            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">M-Pesa Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
              <p className="mt-1.5 text-xs text-stone-400">An STK push prompt will be sent to this number.</p>
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
          </>
        )}
      </PortalModal>
    </div>
  );
}
