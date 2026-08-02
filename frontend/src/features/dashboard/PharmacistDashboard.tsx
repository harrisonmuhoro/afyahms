import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMedications, usePrescriptions, useUpdatePrescriptionStatus } from '@/features/pharmacy/api';
import type { Medication, Prescription } from '@/features/pharmacy/types';

/** Stock below this level is flagged low; below half of it, critical. */
const LOW_STOCK_THRESHOLD = 20;

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function rxNumber(p: Prescription): string {
  return `RX-${String(p.id).padStart(5, '0')}`;
}

const STATUS_CHIP: Record<Prescription['status'], { label: string; className: string }> = {
  pending: { label: 'PENDING', className: 'bg-surface-container-highest text-on-surface-variant' },
  dispensed: { label: 'DISPENSED', className: 'bg-secondary-container/30 text-secondary' },
  cancelled: { label: 'CANCELLED', className: 'bg-error-container/20 text-error' },
};

/**
 * Pharmacist dashboard wired to the Pharmacy module: live KPI row, pending
 * dispensing queue with dispense action, low-stock strip from the medication
 * catalog, and a detail panel for the selected prescription.
 */
export function PharmacistDashboard(): JSX.Element {
  const { data: prescriptions, isLoading: rxLoading, error: rxError } = usePrescriptions();
  const { data: medications, isLoading: medsLoading } = useMedications();
  const updateStatus = useUpdatePrescriptionStatus();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const pending = useMemo(
    () => prescriptions.filter((p) => p.status === 'pending'),
    [prescriptions],
  );
  const dispensedToday = useMemo(
    () => prescriptions.filter((p) => p.status === 'dispensed' && isToday(p.updated_at)),
    [prescriptions],
  );
  const lowStock = useMemo(
    () =>
      medications
        .filter((m) => m.is_active && m.stock_quantity < LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.stock_quantity - b.stock_quantity),
    [medications],
  );
  const criticalStock = lowStock.filter((m) => m.stock_quantity < LOW_STOCK_THRESHOLD / 2);

  const selected = useMemo(
    () => prescriptions.find((p) => p.id === selectedId) ?? pending[0] ?? null,
    [prescriptions, selectedId, pending],
  );

  const onDispense = async (prescription: Prescription): Promise<void> => {
    setFeedback(null);
    try {
      await updateStatus.mutateAsync({ id: prescription.id, status: 'dispensed' });
      setFeedback(`${rxNumber(prescription)} dispensed.`);
    } catch {
      setFeedback('Could not dispense — the prescription may have changed. List refreshes automatically.');
    }
  };

  const stockPct = (m: Medication): number =>
    Math.max(4, Math.min(100, Math.round((m.stock_quantity / LOW_STOCK_THRESHOLD) * 100)));

  return (
    <div className="p-lg space-y-lg">
      {/* Header & Quick Stats */}
      <div className="flex flex-col gap-lg mb-lg">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Pharmacist Dashboard</h1>
            <p className="text-body-md text-on-surface-variant">Overview of pending orders and inventory status.</p>
          </div>
          <div className="flex gap-md">
            <Link
              to="/pharmacy/medications"
              className="flex items-center gap-2 px-md py-2 border border-outline-variant rounded-lg text-body-md font-medium hover:bg-surface-container-low transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">inventory</span>
              Full Inventory
            </Link>
            <Link
              to="/pharmacy/prescriptions"
              className="flex items-center gap-2 px-md py-2 bg-primary text-on-primary rounded-lg text-body-md font-medium hover:opacity-90 transition-opacity"
            >
              <span className="material-symbols-outlined text-[20px]">prescriptions</span>
              All Prescriptions
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
          <div className="bg-surface p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-1">
            <span className="text-label-caps text-on-surface-variant">Dispensed Today</span>
            <div className="flex items-end justify-between">
              <span className="text-headline-lg font-bold text-primary">
                {rxLoading ? '…' : dispensedToday.length}
              </span>
              <span className="material-symbols-outlined text-primary">check_circle</span>
            </div>
          </div>
          <div className="bg-surface p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-1">
            <span className="text-label-caps text-on-surface-variant">Pending Reviews</span>
            <div className="flex items-end justify-between">
              <span className="text-headline-lg font-bold text-on-surface">
                {rxLoading ? '…' : String(pending.length).padStart(2, '0')}
              </span>
              {pending.length > 0 && (
                <span className="px-2 py-0.5 bg-error-container/30 text-error text-[11px] font-bold rounded-full">
                  ACTION REQ.
                </span>
              )}
            </div>
          </div>
          <div
            className={`bg-surface p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-1 ${
              criticalStock.length > 0 ? 'border-l-4 border-l-error' : ''
            }`}
          >
            <span className="text-label-caps text-on-surface-variant">Critical Stock Alerts</span>
            <div className="flex items-end justify-between">
              <span className="text-headline-lg font-bold text-on-surface">
                {medsLoading ? '…' : String(criticalStock.length).padStart(2, '0')}
              </span>
              <span
                className={`material-symbols-outlined ${criticalStock.length > 0 ? 'text-error' : 'text-on-surface-variant'}`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>
            </div>
          </div>
          <div className="bg-surface p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-1">
            <span className="text-label-caps text-on-surface-variant">Catalog Items</span>
            <div className="flex items-end justify-between">
              <span className="text-headline-lg font-bold text-on-surface">
                {medsLoading ? '…' : medications.length}
              </span>
              <span className="material-symbols-outlined text-on-surface-variant">medication</span>
            </div>
          </div>
        </div>
      </div>

      {feedback !== null && (
        <div
          role="status"
          className="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-sm text-on-surface"
        >
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-12 gap-lg items-start">
        {/* Left Column: Dispensing Queue */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-lg">
          <section className="bg-surface rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <h2 className="font-headline-md text-headline-md text-on-surface">Dispensing Queue</h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-primary-container/10 text-primary text-label-caps rounded-full">
                  {prescriptions.length} TOTAL
                </span>
                {pending.length > 0 && (
                  <span className="px-3 py-1 bg-error-container/20 text-error text-label-caps rounded-full">
                    {pending.length} PENDING
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low">
                  <tr>
                    <th className="px-md py-3 text-label-caps text-on-surface-variant">Prescription</th>
                    <th className="px-md py-3 text-label-caps text-on-surface-variant">Patient</th>
                    <th className="px-md py-3 text-label-caps text-on-surface-variant">Prescriber</th>
                    <th className="px-md py-3 text-label-caps text-on-surface-variant">Items</th>
                    <th className="px-md py-3 text-label-caps text-on-surface-variant">Status</th>
                    <th className="px-md py-3 text-label-caps text-on-surface-variant">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {rxLoading ? (
                    <tr>
                      <td colSpan={6} className="px-md py-10 text-center text-body-md text-on-surface-variant">
                        Loading prescriptions…
                      </td>
                    </tr>
                  ) : rxError !== null ? (
                    <tr>
                      <td colSpan={6} className="px-md py-10 text-center text-body-md text-on-surface-variant">
                        Pharmacy service unavailable.
                      </td>
                    </tr>
                  ) : pending.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-md py-10 text-center">
                        <span className="material-symbols-outlined text-[32px] text-outline-variant">
                          medication_liquid
                        </span>
                        <p className="mt-2 text-body-md text-on-surface-variant">
                          Queue is clear — no prescriptions awaiting dispensing.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    pending.map((prescription) => {
                      const active = selected?.id === prescription.id;
                      return (
                        <tr
                          key={prescription.id}
                          onClick={() => setSelectedId(prescription.id)}
                          className={`cursor-pointer transition-colors ${
                            active
                              ? 'bg-primary-container/5 border-l-4 border-l-primary'
                              : 'hover:bg-surface-container'
                          }`}
                        >
                          <td className="px-md py-4">
                            <span className="text-data-mono font-data-mono text-on-surface-variant uppercase">
                              {rxNumber(prescription)}
                            </span>
                          </td>
                          <td className="px-md py-4">
                            <p className="text-body-md font-semibold text-on-surface">
                              Patient #{prescription.patient_id}
                            </p>
                          </td>
                          <td className="px-md py-4">
                            <p className="text-body-md text-on-surface">
                              {prescription.doctor?.name ?? `Doctor #${prescription.doctor_id}`}
                            </p>
                          </td>
                          <td className="px-md py-4 text-body-md font-data-mono text-on-surface-variant">
                            {prescription.items?.length ?? 0}
                          </td>
                          <td className="px-md py-4">
                            <span
                              className={`px-3 py-1 text-[11px] font-bold rounded-full ${STATUS_CHIP[prescription.status].className}`}
                            >
                              {STATUS_CHIP[prescription.status].label}
                            </span>
                          </td>
                          <td className="px-md py-4">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void onDispense(prescription);
                              }}
                              disabled={updateStatus.isPending}
                              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-body-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              {updateStatus.isPending && updateStatus.variables?.id === prescription.id
                                ? 'Dispensing…'
                                : 'Dispense'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Inventory Overview */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            <div className="bg-surface p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-md">
              <div className="flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md text-on-surface">Stock Critical</h3>
                <Link to="/pharmacy/medications" className="text-primary text-label-caps hover:underline">
                  Full Inventory
                </Link>
              </div>
              {medsLoading ? (
                <p className="text-body-sm text-on-surface-variant py-4">Loading stock levels…</p>
              ) : lowStock.length === 0 ? (
                <p className="flex items-center gap-2 py-4 text-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
                  All stock levels are healthy.
                </p>
              ) : (
                <div className="space-y-4">
                  {lowStock.slice(0, 5).map((medication) => {
                    const critical = medication.stock_quantity < LOW_STOCK_THRESHOLD / 2;
                    return (
                      <div key={medication.id} className="space-y-1">
                        <div className="flex justify-between text-body-sm">
                          <span className="font-medium truncate">
                            {medication.name}
                            {medication.strength !== null && (
                              <span className="ml-1.5 font-data-mono text-on-surface-variant">
                                {medication.strength}
                              </span>
                            )}
                          </span>
                          <span className={critical ? 'text-error font-bold' : 'text-on-surface-variant'}>
                            {medication.stock_quantity} left
                          </span>
                        </div>
                        <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`${critical ? 'bg-error' : 'bg-primary'} h-full`}
                            style={{ width: `${stockPct(medication)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-surface p-md rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex flex-col items-center justify-center text-center gap-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="w-16 h-16 bg-primary-container/20 rounded-full flex items-center justify-center text-primary mb-2">
                <span className="material-symbols-outlined text-[32px]">inventory</span>
              </div>
              <h3 className="font-headline-md text-headline-md">Medication Catalog</h3>
              <p className="text-body-md text-on-surface-variant max-w-[200px]">
                Manage stock levels, pricing and the drug catalog for this branch.
              </p>
              <Link
                to="/pharmacy/medications"
                className="mt-2 px-md py-2 border border-primary text-primary rounded-lg text-body-sm font-semibold hover:bg-primary/5 transition-colors"
              >
                Open Catalog
              </Link>
            </div>
          </section>
        </div>

        {/* Right Column: Prescription Detail View */}
        <div className="col-span-12 lg:col-span-4 sticky top-[84px]">
          <section className="bg-surface rounded-xl border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
            {selected === null ? (
              <div className="p-lg py-12 text-center">
                <span className="material-symbols-outlined text-[32px] text-outline-variant">contract</span>
                <p className="mt-2 text-body-md text-on-surface-variant">
                  Select a prescription from the queue to review its details.
                </p>
              </div>
            ) : (
              <>
                <div className="p-md bg-primary-container/5 border-b border-outline-variant flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 bg-primary-container/20 text-primary text-[10px] font-bold rounded tracking-wider uppercase">
                      Active Selection
                    </span>
                    <span className="text-data-mono text-[12px] text-on-surface-variant">
                      {rxNumber(selected)}
                    </span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    Patient #{selected.patient_id}
                  </h2>
                  <div className="flex gap-4">
                    <div className="flex flex-col">
                      <span className="text-label-caps text-on-surface-variant">PRESCRIBER</span>
                      <span className="text-body-md font-semibold">
                        {selected.doctor?.name ?? `Doctor #${selected.doctor_id}`}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-label-caps text-on-surface-variant">STATUS</span>
                      <span className="text-body-md font-semibold capitalize">{selected.status}</span>
                    </div>
                  </div>
                </div>

                <div className="p-md flex flex-col gap-md">
                  {/* Drug Detail Cards */}
                  {(selected.items ?? []).length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant py-2">
                      No line items on this prescription.
                    </p>
                  ) : (
                    (selected.items ?? []).map((item) => (
                      <div
                        key={item.id}
                        className="bg-surface-container-low p-md rounded-lg border border-outline-variant/30"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-body-md font-bold text-primary uppercase">
                            {item.medication?.name ?? `Medication #${item.medication_id}`}
                          </span>
                          <span className="text-data-mono text-body-sm">
                            {item.medication?.strength ?? ''}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-y-3">
                          <div>
                            <p className="text-label-caps text-on-surface-variant">QUANTITY</p>
                            <p className="text-body-md font-data-mono">{item.quantity}</p>
                          </div>
                          <div>
                            <p className="text-label-caps text-on-surface-variant">FORM</p>
                            <p className="text-body-md">{item.medication?.dosage_form ?? '—'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-label-caps text-on-surface-variant">INSTRUCTIONS</p>
                            <p className="text-body-sm leading-relaxed">{item.dosage_instructions}</p>
                          </div>
                        </div>
                        {item.medication !== undefined &&
                          item.medication.stock_quantity < item.quantity && (
                            <div className="mt-3 bg-error-container/10 border border-error/20 p-2.5 rounded-lg flex gap-2">
                              <span
                                className="material-symbols-outlined text-error text-[18px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                warning
                              </span>
                              <p className="text-body-sm text-on-surface-variant">
                                <span className="font-bold text-error">INSUFFICIENT STOCK — </span>
                                only {item.medication.stock_quantity} in stock for a quantity of {item.quantity}.
                              </p>
                            </div>
                          )}
                      </div>
                    ))
                  )}

                  {selected.status === 'pending' && (
                    <div className="flex flex-col gap-sm mt-md">
                      <button
                        type="button"
                        onClick={() => void onDispense(selected)}
                        disabled={updateStatus.isPending}
                        className="w-full py-3 bg-primary text-on-primary rounded-lg font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[20px]">verified_user</span>
                        {updateStatus.isPending ? 'Dispensing…' : 'Verify & Dispense'}
                      </button>
                    </div>
                  )}

                  {selected.notes !== null && selected.notes.trim() !== '' && (
                    <div className="mt-lg pt-md border-t border-outline-variant">
                      <p className="text-label-caps text-on-surface-variant mb-md">CLINICAL NOTES</p>
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center">
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                            history
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-body-sm text-on-surface italic">"{selected.notes}"</p>
                          <p className="text-label-caps text-on-surface-variant mt-1">
                            — {selected.doctor?.name ?? `Doctor #${selected.doctor_id}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
