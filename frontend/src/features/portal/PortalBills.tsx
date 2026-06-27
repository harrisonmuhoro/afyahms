import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';

interface Invoice {
  id: string;
  date: string;
  services: string[];
  amount: number;
  paid: number;
  status: 'paid' | 'outstanding' | 'partial';
}

const INVOICES: Invoice[] = [
  {
    id: 'INV-2026-0041',
    date: '22 Jun 2026',
    services: ['Lab: CBC', 'Lab: Lipid Panel', 'Consultation Fee'],
    amount: 3800,
    paid: 2480,
    status: 'partial',
  },
  {
    id: 'INV-2026-0038',
    date: '12 Jun 2026',
    services: ['Cardiology Consultation', 'ECG'],
    amount: 4500,
    paid: 0,
    status: 'outstanding',
  },
  {
    id: 'INV-2026-0029',
    date: '28 May 2026',
    services: ['Diabetology Consultation', 'HbA1c Test'],
    amount: 2850,
    paid: 2850,
    status: 'paid',
  },
  {
    id: 'INV-2026-0015',
    date: '15 Mar 2026',
    services: ['Emergency Observation (48hr)', 'Nursing Care', 'Meals'],
    amount: 18500,
    paid: 18500,
    status: 'paid',
  },
];

const totalOutstanding = INVOICES.reduce((sum, inv) => sum + (inv.amount - inv.paid), 0);

const STATUS_CONFIG = {
  paid: {
    label: 'Paid',
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  outstanding: {
    label: 'Outstanding',
    classes: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  },
  partial: {
    label: 'Partial',
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  },
};

export function PortalBills(): JSX.Element {
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handlePay = (id: string): void => {
    setPayingId(id);
    // Simulate STK push flow
    setTimeout(() => {
      setPayingId(null);
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 4000);
    }, 2000);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">Bills & Pay</h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">
          View your invoices and settle outstanding bills via M-Pesa.
        </p>
      </div>

      {/* M-Pesa Success Toast */}
      {paymentSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-800 dark:bg-emerald-900/20">
          <Icon name="check" size={20} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            M-Pesa payment initiated! Check your phone for the STK push prompt.
          </p>
        </div>
      )}

      {/* Account Summary */}
      {totalOutstanding > 0 && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 p-6 text-white shadow-lg">
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-4 right-16 h-20 w-20 rounded-full bg-white/5" />

          <p className="text-sm font-medium text-teal-200">Total Outstanding Balance</p>
          <p className="mt-1 text-4xl font-black tracking-tight">
            KES {totalOutstanding.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-teal-300">Across {INVOICES.filter(i => i.status !== 'paid').length} invoice(s)</p>

          <button
            type="button"
            onClick={() => handlePay('ALL')}
            disabled={payingId !== null}
            className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white shadow-md transition-all hover:bg-emerald-400 disabled:opacity-60"
          >
            {payingId === 'ALL' ? (
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
                Pay All with M-Pesa
              </>
            )}
          </button>
        </div>
      )}

      {/* Invoice List */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Invoice History
        </h2>
        <div className="space-y-4">
          {INVOICES.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status];
            const outstanding = inv.amount - inv.paid;
            return (
              <div
                key={inv.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-stone-400 dark:text-stone-500">{inv.id}</p>
                    <p className="mt-0.5 font-bold text-stone-900 dark:text-stone-100">{inv.date}</p>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.classes}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Services */}
                <ul className="mb-4 space-y-1">
                  {inv.services.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
                      {s}
                    </li>
                  ))}
                </ul>

                {/* Amount breakdown */}
                <div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500 dark:text-stone-400">Total</span>
                    <span className="font-semibold text-stone-700 dark:text-stone-300">KES {inv.amount.toLocaleString()}</span>
                  </div>
                  {inv.paid > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-stone-500 dark:text-stone-400">Paid</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">– KES {inv.paid.toLocaleString()}</span>
                    </div>
                  )}
                  {outstanding > 0 && (
                    <div className="flex justify-between border-t border-stone-200 pt-2 mt-2 text-sm dark:border-stone-700">
                      <span className="font-bold text-stone-700 dark:text-stone-300">Balance</span>
                      <span className="font-black text-red-600 dark:text-red-400">KES {outstanding.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {outstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => handlePay(inv.id)}
                    disabled={payingId !== null}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white transition-colors hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {payingId === inv.id ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Sending prompt…
                      </>
                    ) : (
                      <>
                        <Icon name="payments" size={18} />
                        Pay KES {outstanding.toLocaleString()} with M-Pesa
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
