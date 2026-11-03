import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { PortalModal, ToastBanner } from './PortalModal';
import { usePortalInvoices, usePayPortalInvoice, type PortalInvoice } from './api';

const STATUS_CONFIG = {
  cleared: { label: 'Paid', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  waived:  { label: 'Waived', classes: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400' },
  pending: { label: 'Outstanding', classes: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
  partial: { label: 'Partial', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
};

export function PortalBills(): JSX.Element {
  const [payModal, setPayModal] = useState<{ publicId: string; amount: number } | null>(null);
  const [phone, setPhone]       = useState('');
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  const { data, isLoading }  = usePortalInvoices();
  const payMutation           = usePayPortalInvoice();

  const invoices: PortalInvoice[] = (data as any)?.data ?? [];
  const totalOutstanding = invoices.reduce((sum, inv) => sum + Math.max(0, inv.total_amount - inv.paid_amount), 0);
  const outstandingInvoices = invoices.filter(inv => !['cleared', 'waived'].includes(inv.status));

  const showToast = (msg: string, type: 'success' | 'info' = 'success'): void => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handlePay = async (): Promise<void> => {
    if (!payModal) return;
    try {
      await payMutation.mutateAsync({ publicId: payModal.publicId, phone });
      setPayModal(null);
      setPhone('');
      showToast('M-Pesa prompt sent. Enter your PIN on your phone to complete the payment.', 'info');
    } catch {
      showToast('Payment failed. Please try again.', 'info');
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      {toast && <ToastBanner message={toast.msg} type={toast.type} />}

      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">Bills &amp; Pay</h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">View your invoices and settle outstanding bills via M-Pesa.</p>
      </div>

      {/* Account Summary Hero */}
      {isLoading ? (
        <div className="rounded-2xl bg-stone-100 p-6 animate-pulse dark:bg-stone-800" style={{ height: 120 }} />
      ) : totalOutstanding > 0 ? (
        <div className="relative overflow-hidden rounded-2xl bg-teal-600 p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-4 right-16 h-20 w-20 rounded-full bg-white/5" />
          <p className="text-sm font-medium text-teal-200">Total Outstanding Balance</p>
          <p className="mt-1 text-4xl font-black tracking-tight">KES {totalOutstanding.toLocaleString()}</p>
          <p className="mt-1 text-sm text-teal-300">Across {outstandingInvoices.length} invoice(s)</p>
          <button
            type="button"
            onClick={() => {
              const first = outstandingInvoices[0];
              if (first) setPayModal({ publicId: first.public_id, amount: totalOutstanding });
            }}
            className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white shadow-md hover:bg-emerald-400"
          >
            <Icon name="payments" size={18} />
            Pay with M-Pesa
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-900/20">
          <Icon name="check" size={24} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-bold text-emerald-800 dark:text-emerald-300">All paid up!</p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">You have no outstanding balances.</p>
          </div>
        </div>
      )}

      {/* Invoice List */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">Invoice History</h2>
        <div className="space-y-4">
          {isLoading && <p className="animate-pulse py-4 text-center text-sm text-stone-400">Loading invoices…</p>}
          {!isLoading && invoices.length === 0 && (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900/30">
              <p className="text-sm text-stone-400">No invoices found.</p>
            </div>
          )}
          {invoices.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.pending;
            const outstanding = Math.max(0, inv.total_amount - inv.paid_amount);
            const dateStr = new Date(inv.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const statusConfig = inv.mpesa_status === 'pending'
              ? { label: 'Payment pending', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' }
              : cfg;
            return (
              <div key={inv.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="mt-0.5 font-bold text-stone-900 dark:text-stone-100">{dateStr}</p>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusConfig.classes}`}>{statusConfig.label}</span>
                </div>
                {inv.items.length > 0 && (
                  <ul className="mb-4 space-y-1">
                    {inv.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600" />
                        {item.description} {item.quantity > 1 && `× ${item.quantity}`}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500 dark:text-stone-400">Total</span>
                    <span className="font-semibold text-stone-700 dark:text-stone-300">KES {inv.total_amount.toLocaleString()}</span>
                  </div>
                  {inv.paid_amount > 0 && (
                    <div className="mt-1 flex justify-between text-sm">
                      <span className="text-stone-500 dark:text-stone-400">Paid</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">– KES {inv.paid_amount.toLocaleString()}</span>
                    </div>
                  )}
                  {outstanding > 0 && (
                    <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-sm dark:border-stone-700">
                      <span className="font-bold text-stone-700 dark:text-stone-300">Balance</span>
                      <span className="font-black text-red-600 dark:text-red-400">KES {outstanding.toLocaleString()}</span>
                    </div>
                  )}
                </div>
                {outstanding > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayModal({ publicId: inv.public_id, amount: outstanding })}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white hover:bg-emerald-600"
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

      {/* M-Pesa Payment Modal */}
      <PortalModal isOpen={payModal !== null} onClose={() => !payMutation.isPending && setPayModal(null)} title="Pay with M-Pesa">
        {payModal && (
          <>
            <div className="mb-5 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/20">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Amount to Pay</p>
              <p className="mt-0.5 text-3xl font-black text-emerald-700 dark:text-emerald-300">KES {payModal.amount.toLocaleString()}</p>
            </div>
            <div className="mb-6">
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">M-Pesa Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
              <p className="mt-1.5 text-xs text-stone-400">An STK push prompt will be sent to this number.</p>
            </div>
            <button type="button" onClick={() => void handlePay()} disabled={payMutation.isPending || phone.trim().length < 9}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white hover:bg-emerald-600 disabled:opacity-60">
              {payMutation.isPending ? 'Processing…' : <><Icon name="payments" size={18} />Send M-Pesa Prompt</>}
            </button>
          </>
        )}
      </PortalModal>
    </div>
  );
}
