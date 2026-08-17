import { useMemo, useState } from 'react';
import { useBoard } from '@/features/queue/api';
import { useBill, useRecordPayment, useMarkBillCleared } from '@/features/queue/billingApi';
import { httpClient } from '@/lib/http';
import type { QueueTicket } from '@/features/queue/types';

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Cash', icon: 'payments' },
  { key: 'mpesa', label: 'M-Pesa', icon: 'smartphone' },
  { key: 'card', label: 'Card', icon: 'credit_card' },
  { key: 'insurance', label: 'Insurance', icon: 'health_and_safety' },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['key'];

function kes(value: number): string {
  return `KES ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const BILL_STATUS_CHIP: Record<string, string> = {
  pending: 'bg-error-container/20 text-error',
  partial: 'bg-tertiary-container/10 text-tertiary',
  cleared: 'bg-secondary-container/20 text-secondary',
  waived: 'bg-surface-container-high text-on-surface-variant',
};

/**
 * Billing dashboard wired to the BIL queue board + the Billing module:
 * live billing queue, itemised bill for the selected visit, payment panel
 * with method chips + auto-calculated change, and a reason-gated override.
 */
export function BillingDashboard(): JSX.Element {
  const { snapshot, isLoading } = useBoard('BIL');
  const [selected, setSelected] = useState<QueueTicket | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const tickets = useMemo(() => {
    const list: QueueTicket[] = [];
    if (snapshot?.in_service != null) list.push(snapshot.in_service);
    list.push(...(snapshot?.waiting ?? []));
    return list;
  }, [snapshot]);

  const activeTicket = selected ?? tickets[0] ?? null;
  const { bill, isLoading: billLoading } = useBill(activeTicket?.visit_id ?? null);
  const recordPayment = useRecordPayment(activeTicket?.visit_id ?? 0);
  const markCleared = useMarkBillCleared(activeTicket?.visit_id ?? 0);

  const amountDue = bill?.balance ?? 0;
  const tenderedNum = Number.parseFloat(tendered) || 0;
  const change = Math.max(0, tenderedNum - amountDue);

  const openReceipt = async (): Promise<void> => {
    if (activeTicket?.visit_id == null) return;
    try {
      const token = httpClient.getToken();
      const baseUrl = String((httpClient as unknown as { instance: { defaults: { baseURL?: string } } })
        .instance?.defaults?.baseURL ?? '');
      const response = await fetch(
        `${baseUrl}/billing/visits/${activeTicket.visit_id}/receipt`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (!response.ok) return;
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      // silent — billing staff will see no PDF pop-up on network failure
    }
  };

  const onCollect = async (): Promise<void> => {
    if (activeTicket === null || bill === null || tenderedNum <= 0) return;
    setFeedback(null);
    try {
      const paid = Math.min(tenderedNum, amountDue);
      const updatedBill = await recordPayment.mutateAsync({ amount: paid, method });
      setFeedback(
        `Received ${kes(paid)} (${method}) for ${activeTicket.patient_name ?? 'patient'}${
          change > 0 ? ` — change ${kes(change)}` : ''
        }.`,
      );
      setTendered('');
      // Auto-open receipt PDF if the bill is now cleared
      // updatedBill is { data: Bill } per billingApi.ts return type
      if (updatedBill?.data?.status === 'cleared' || updatedBill?.data?.status === 'waived') {
        void openReceipt();
      }
    } catch {
      setFeedback('Payment failed — refresh and try again.');
    }
  };

  const onWaive = async (): Promise<void> => {
    if (activeTicket === null) return;
    const reason = window.prompt('Reason for clearing this bill without full payment (logged to audit):');
    if (reason === null || reason.trim().length < 5) return;
    setFeedback(null);
    try {
      await markCleared.mutateAsync({ reason: reason.trim() });
      setFeedback('Bill cleared with override.');
    } catch {
      setFeedback('Override failed.');
    }
  };

  // KPIs derived from the visible queue + selected bill data.
  const waitingCount = snapshot?.waiting.length ?? 0;

  return (
    <div className="p-lg max-w-[1600px] mx-auto min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-lg">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-surface">Billing &amp; Payments</h2>
          <p className="text-body-md text-on-surface-variant">
            Collect payments for visits routed to the billing station.
          </p>
        </div>
      </div>

      {/* Financial Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-lg">
        <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-start mb-sm">
            <p className="text-label-caps font-label-caps text-on-surface-variant">IN BILLING QUEUE</p>
            <span className="material-symbols-outlined text-primary-container">list_alt</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-headline-lg font-data-mono text-on-surface">{isLoading ? '…' : waitingCount}</h3>
          </div>
          <div className="mt-base w-full bg-surface-container h-1 rounded-full overflow-hidden">
            <div className="bg-primary h-full" style={{ width: '40%' }}></div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-start mb-sm">
            <p className="text-label-caps font-label-caps text-on-surface-variant">NOW SERVING</p>
            <span className="material-symbols-outlined text-secondary">point_of_sale</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-headline-lg font-data-mono text-on-surface">
              {snapshot?.in_service?.ticket_number ?? '—'}
            </h3>
          </div>
          <div className="mt-base w-full bg-surface-container h-1 rounded-full overflow-hidden">
            <div className="bg-secondary h-full" style={{ width: '100%' }}></div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-start mb-sm">
            <p className="text-label-caps font-label-caps text-on-surface-variant">SELECTED BILL BALANCE</p>
            <span className="material-symbols-outlined text-tertiary">payments</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-headline-lg font-data-mono text-on-surface">
              {billLoading ? '…' : bill !== null ? kes(bill.balance) : '—'}
            </h3>
          </div>
          <div className="mt-base w-full bg-surface-container h-1 rounded-full overflow-hidden">
            <div className="bg-tertiary h-full" style={{ width: '60%' }}></div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-start mb-sm">
            <p className="text-label-caps font-label-caps text-on-surface-variant">STATION STATUS</p>
            <span className="material-symbols-outlined text-primary">point_of_sale</span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-headline-lg font-data-mono text-on-surface capitalize">
              {snapshot?.station.status ?? '—'}
            </h3>
          </div>
          <div className="mt-base w-full bg-surface-container h-1 rounded-full overflow-hidden">
            <div className="bg-primary-container h-full w-full"></div>
          </div>
        </div>
      </div>

      {feedback !== null && (
        <div
          role="status"
          className="mb-lg bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-sm text-on-surface"
        >
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-12 gap-lg">
        {/* Billing Queue & Recent Transactions */}
        <div className="col-span-12 xl:col-span-7 space-y-lg">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-md border-b border-outline-variant flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">list_alt</span>
                <h4 className="text-headline-md font-headline-md text-on-surface">Billing Queue</h4>
              </div>
            </div>
            {isLoading && snapshot === null ? (
              <p className="p-md py-10 text-center text-body-md text-on-surface-variant">Loading queue…</p>
            ) : tickets.length === 0 ? (
              <div className="p-md py-10 text-center">
                <span className="material-symbols-outlined text-[32px] text-outline-variant">receipt_long</span>
                <p className="mt-2 text-body-md text-on-surface-variant">No patients waiting at billing.</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant">
                {tickets.map((ticket) => {
                  const active = activeTicket?.id === ticket.id;
                  return (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => {
                        setSelected(ticket);
                        setFeedback(null);
                        setTendered('');
                      }}
                      className={`w-full text-left p-md transition-colors flex items-center justify-between gap-3 ${
                        active ? 'bg-primary-container/10' : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-data-mono font-bold text-on-surface">{ticket.ticket_number}</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-on-surface truncate">{ticket.patient_name ?? '—'}</p>
                          <p className="text-body-sm text-on-surface-variant font-data-mono">
                            {ticket.patient_number ?? '—'} · Visit #{ticket.visit_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ticket.state === 'in_service' && (
                          <span className="px-2 py-0.5 rounded bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                            Serving
                          </span>
                        )}
                        <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Transactions Feed — no transactions endpoint yet */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <div className="p-md border-b border-outline-variant flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">history</span>
                <h4 className="text-headline-md font-headline-md text-on-surface">Recent Transactions</h4>
              </div>
            </div>
            <div className="p-md py-8 text-center">
              <span className="material-symbols-outlined text-[28px] text-outline-variant">receipt</span>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                A live payment feed will appear here once the transactions endpoint is available.
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Payment Panel & Insurance Tools */}
        <div className="col-span-12 xl:col-span-5 space-y-lg">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-md border-b border-outline-variant">
              <h4 className="text-headline-md font-headline-md text-on-surface">
                {activeTicket !== null
                  ? `Bill — ${activeTicket.patient_name ?? activeTicket.ticket_number}`
                  : 'Bill details'}
              </h4>
            </div>

            {activeTicket === null ? (
              <p className="p-md py-10 text-center text-body-md text-on-surface-variant">
                Select a patient from the queue.
              </p>
            ) : billLoading ? (
              <p className="p-md py-10 text-center text-body-md text-on-surface-variant">Loading bill…</p>
            ) : bill === null ? (
              <p className="p-md py-10 text-center text-body-md text-on-surface-variant">
                No bill found for this visit yet.
              </p>
            ) : (
              <div className="p-md space-y-md">
                {/* Itemised charges */}
                <div className="border border-outline-variant rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-surface-container-low">
                      <tr className="text-label-caps text-on-surface-variant">
                        <th className="px-3 py-2 font-semibold">Item</th>
                        <th className="px-3 py-2 font-semibold text-right">Qty</th>
                        <th className="px-3 py-2 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {bill.items.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-body-sm text-on-surface-variant">
                            No line items.
                          </td>
                        </tr>
                      ) : (
                        bill.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-body-sm">
                              {item.description}
                              <span className="ml-1 text-[10px] uppercase text-on-surface-variant">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-body-sm text-right font-data-mono">{item.quantity}</td>
                            <td className="px-3 py-2 text-body-sm text-right font-data-mono">
                              {kes(item.total_price)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="space-y-1 text-body-sm">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Total</span>
                    <span className="font-data-mono">{kes(bill.total_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Paid</span>
                    <span className="font-data-mono text-secondary">{kes(bill.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-outline-variant">
                    <span className="font-bold text-on-surface flex items-center gap-2">
                      Balance
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          BILL_STATUS_CHIP[bill.status] ?? 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {bill.status}
                      </span>
                    </span>
                    <span className="font-data-mono text-headline-md font-bold text-on-surface">
                      {kes(bill.balance)}
                    </span>
                  </div>
                </div>

                {!bill.is_cleared && (
                  <>
                    {/* Payment method chips */}
                    <div>
                      <span className="block text-body-sm font-semibold text-on-surface mb-1.5">Payment method</span>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payment method">
                        {PAYMENT_METHODS.map((m) => (
                          <button
                            key={m.key}
                            type="button"
                            role="radio"
                            aria-checked={method === m.key}
                            onClick={() => setMethod(m.key)}
                            className={`px-3 py-1.5 rounded-full text-body-sm font-semibold border flex items-center gap-1.5 transition-all ${
                              method === m.key
                                ? 'bg-primary text-white border-primary'
                                : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">{m.icon}</span>
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tendered / change */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="bil-tendered" className="block text-body-sm font-semibold text-on-surface mb-1.5">
                          Amount tendered
                        </label>
                        <input
                          id="bil-tendered"
                          type="number"
                          min="0"
                          step="0.01"
                          value={tendered}
                          onChange={(e) => setTendered(e.target.value)}
                          className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-sm font-data-mono focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder={String(amountDue)}
                        />
                      </div>
                      <div>
                        <span className="block text-body-sm font-semibold text-on-surface mb-1.5">Change</span>
                        <p className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-sm font-data-mono">
                          {kes(change)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void onCollect()}
                        disabled={tenderedNum <= 0 || recordPayment.isPending}
                        className="flex-1 bg-primary text-white py-2.5 rounded-lg font-semibold active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">point_of_sale</span>
                        {recordPayment.isPending ? 'Processing…' : 'Collect Payment'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void onWaive()}
                        disabled={markCleared.isPending}
                        title="Clear the bill without full payment (requires reason)"
                        className="px-4 border border-outline-variant text-on-surface-variant py-2.5 rounded-lg hover:bg-surface-container transition-all disabled:opacity-50"
                      >
                        Override
                      </button>
                    </div>
                  </>
                )}

                {bill.is_cleared && (
                  <p className="text-body-sm text-secondary font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                    Bill cleared
                    {bill.cleared_at !== null
                      ? ` on ${new Date(bill.cleared_at).toLocaleString('en-GB')}`
                      : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Insurance Claims Panel — no claims backend yet */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-md border-b border-outline-variant bg-tertiary/5">
              <h4 className="text-headline-md font-headline-md text-tertiary flex items-center gap-2">
                <span className="material-symbols-outlined">shield_with_heart</span>
                Insurance Claims Status
              </h4>
            </div>
            <div className="p-md py-8 text-center">
              <span className="material-symbols-outlined text-[28px] text-outline-variant">shield</span>
              <p className="mt-2 text-body-sm text-on-surface-variant">
                Claim tracking will appear here once the insurance module is enabled.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <h4 className="text-label-caps font-label-caps text-on-surface-variant mb-md">Revenue Tools</h4>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={openReceipt}
                disabled={activeTicket?.visit_id == null}
                className="w-full bg-primary-container text-on-primary-container p-4 rounded-lg flex flex-col items-start gap-1 hover:brightness-110 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[24px]">description</span>
                <span className="font-bold text-body-md">Download Receipt PDF</span>
                <span className="text-[11px] opacity-80">Generate & open a print-ready receipt</span>
              </button>
              <button className="w-full bg-surface border border-outline-variant text-on-surface p-4 rounded-lg flex flex-col items-start gap-1 hover:bg-surface-container transition-all">
                <span className="material-symbols-outlined text-[24px] text-tertiary">assessment</span>
                <span className="font-bold text-body-md">Export Revenue Report</span>
                <span className="text-[11px] text-on-surface-variant">Daily, Weekly or Monthly PDF/Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating Action Button (Contextual) */}
      <button className="fixed bottom-lg right-lg w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all group z-50">
        <span className="material-symbols-outlined text-[28px]">post_add</span>
        <span className="absolute right-full mr-4 bg-inverse-surface text-inverse-on-surface px-3 py-1.5 rounded text-body-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">New Bill Item</span>
      </button>
    </div>
  );
}
