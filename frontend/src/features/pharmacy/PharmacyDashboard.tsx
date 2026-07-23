import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from '@/components/icons/Icon';
import { useMedications, usePrescriptions, useUpdatePrescriptionStatus } from './api';
import { PrescriptionQueueCard, PrescriptionStatusPill } from './PrescriptionQueueCard';
import type { Medication, Prescription } from './types';

/** Stock below this level is flagged as low (amber) and critical below half of it. */
const LOW_STOCK_THRESHOLD = 20;

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ─── KPI card ───────────────────────────────────────────────────────────────── */
interface KpiCardProps {
  label: string;
  value: string;
  hint: string;
  icon: IconName;
  iconClass: string;
  hintClass?: string;
  accentClass?: string;
}

function KpiCard({
  label,
  value,
  hint,
  icon,
  iconClass,
  hintClass,
  accentClass,
}: KpiCardProps): JSX.Element {
  return (
    <div
      className={cn(
        'card p-4 transition-colors hover:border-brand-300 dark:hover:border-brand-700',
        accentClass,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {label}
        </span>
        <Icon name={icon} size={18} className={iconClass} />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-stone-900 dark:text-stone-50">{value}</span>
        <span className={cn('text-xs font-medium text-stone-500 dark:text-stone-400', hintClass)}>
          {hint}
        </span>
      </div>
    </div>
  );
}

/* ─── Low-stock row with progress bar ────────────────────────────────────────── */
function StockAlertRow({ medication }: { medication: Medication }): JSX.Element {
  const pct = Math.min(100, Math.round((medication.stock_quantity / LOW_STOCK_THRESHOLD) * 100));
  const critical = medication.stock_quantity < LOW_STOCK_THRESHOLD / 2;

  return (
    <li className="space-y-1 py-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate font-medium text-stone-800 dark:text-stone-200">
          {medication.name}
          {medication.strength !== null && (
            <span className="ml-1.5 font-mono text-xs text-stone-500 dark:text-stone-400">
              {medication.strength}
            </span>
          )}
        </span>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 font-mono text-xs font-bold',
            critical
              ? 'text-clinical-triage_red dark:text-red-400'
              : 'text-clinical-warning dark:text-amber-400',
          )}
        >
          <Icon name="alertCircle" size={12} />
          {medication.stock_quantity} left
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
        role="progressbar"
        aria-valuenow={medication.stock_quantity}
        aria-valuemin={0}
        aria-valuemax={LOW_STOCK_THRESHOLD}
        aria-label={`${medication.name} stock level`}
      >
        <div
          className={cn('h-full', critical ? 'bg-clinical-triage_red' : 'bg-clinical-warning')}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
    </li>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export function PharmacyDashboard(): JSX.Element {
  const {
    data: prescriptions,
    isLoading: prescriptionsLoading,
    error: prescriptionsError,
  } = usePrescriptions();
  const {
    data: medications,
    isLoading: medicationsLoading,
    error: medicationsError,
  } = useMedications();
  const updateStatus = useUpdatePrescriptionStatus();

  const handleDispense = (id: number): void => {
    updateStatus.mutate({ id, status: 'dispensed' });
  };

  const pending = useMemo(
    () => prescriptions.filter((p: Prescription) => p.status === 'pending'),
    [prescriptions],
  );
  const dispensed = useMemo(
    () =>
      prescriptions
        .filter((p: Prescription) => p.status !== 'pending')
        .sort(
          (a: Prescription, b: Prescription) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        ),
    [prescriptions],
  );
  const dispensedToday = useMemo(
    () => dispensed.filter((p: Prescription) => p.status === 'dispensed' && isToday(p.updated_at)),
    [dispensed],
  );
  const lowStock = useMemo(
    () =>
      medications
        .filter((m: Medication) => m.is_active && m.stock_quantity < LOW_STOCK_THRESHOLD)
        .sort((a: Medication, b: Medication) => a.stock_quantity - b.stock_quantity),
    [medications],
  );
  const inactiveCount = useMemo(
    () => medications.filter((m: Medication) => !m.is_active).length,
    [medications],
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            Pharmacy Dashboard
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Overview of pending orders and inventory status.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/pharmacy/medications" className="btn-secondary text-sm">
            <Icon name="inventory" size={16} />
            Inventory
          </Link>
          <Link to="/pharmacy/prescriptions" className="btn-primary text-sm">
            <Icon name="pharmacy" size={16} />
            Prescriptions
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pending Verification"
          value={prescriptionsLoading ? '…' : String(pending.length)}
          hint={pending.length > 0 ? 'action required' : 'all clear'}
          hintClass={
            pending.length > 0 ? 'text-clinical-warning dark:text-amber-400' : undefined
          }
          icon="clinical"
          iconClass="text-brand-600 dark:text-brand-400"
          accentClass={
            pending.length > 0 ? 'border-l-4 border-l-brand-600 dark:border-l-brand-500' : undefined
          }
        />
        <KpiCard
          label="Dispensed Today"
          value={prescriptionsLoading ? '…' : String(dispensedToday.length)}
          hint="prescriptions"
          icon="check"
          iconClass="text-clinical-triage_green"
        />
        <KpiCard
          label="Low-Stock Items"
          value={medicationsLoading ? '…' : String(lowStock.length)}
          hint={`below ${LOW_STOCK_THRESHOLD} units`}
          hintClass={
            lowStock.length > 0 ? 'text-clinical-warning dark:text-amber-400' : undefined
          }
          icon="alertCircle"
          iconClass="text-clinical-warning dark:text-amber-400"
          accentClass={
            lowStock.length > 0
              ? 'border-l-4 border-l-clinical-warning'
              : undefined
          }
        />
        <KpiCard
          label="Catalog Items"
          value={medicationsLoading ? '…' : String(medications.length)}
          hint={inactiveCount > 0 ? `${inactiveCount} inactive` : 'all active'}
          icon="inventory"
          iconClass="text-stone-400 dark:text-stone-500"
        />
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        {/* Left — verification queue */}
        <section className="space-y-3 lg:col-span-3" aria-labelledby="verification-queue-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="verification-queue-title"
              className="text-lg font-semibold text-stone-900 dark:text-stone-100"
            >
              Verification Queue
            </h2>
            <div className="flex gap-2">
              <span className="chip bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                {prescriptions.length} total
              </span>
              {pending.length > 0 && (
                <span className="chip bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  <Icon name="alertCircle" size={12} />
                  {pending.length} pending
                </span>
              )}
            </div>
          </div>

          {prescriptionsError !== null && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              <Icon name="alertCircle" size={16} />
              Failed to load prescriptions.
            </div>
          )}

          {prescriptionsLoading ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Loading prescriptions…</p>
          ) : pending.length === 0 && prescriptionsError === null ? (
            <div className="card flex flex-col items-center gap-1 p-8 text-center">
              <Icon name="check" size={24} className="text-clinical-triage_green" />
              <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                Queue is clear
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                No prescriptions awaiting verification.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((prescription: Prescription) => (
                <PrescriptionQueueCard
                  key={prescription.id}
                  prescription={prescription}
                  onDispense={handleDispense}
                  isDispensing={
                    updateStatus.isPending && updateStatus.variables?.id === prescription.id
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Right — inventory alerts */}
        <section className="space-y-4 lg:col-span-2" aria-labelledby="inventory-alerts-title">
          <h2
            id="inventory-alerts-title"
            className="text-lg font-semibold text-stone-900 dark:text-stone-100"
          >
            Inventory Alerts
          </h2>

          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-200">
                <Icon name="alertCircle" size={16} className="text-clinical-warning" />
                Low Stock
              </h3>
              <Link
                to="/pharmacy/medications"
                className="text-xs font-semibold uppercase tracking-wide text-brand-700 hover:underline dark:text-brand-300"
              >
                Full Inventory
              </Link>
            </div>

            {medicationsError !== null && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              >
                <Icon name="alertCircle" size={16} />
                Failed to load medications.
              </div>
            )}

            {medicationsLoading ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Loading stock levels…</p>
            ) : lowStock.length === 0 && medicationsError === null ? (
              <p className="flex items-center gap-2 py-2 text-sm text-stone-500 dark:text-stone-400">
                <Icon name="check" size={14} className="text-clinical-triage_green" />
                All stock levels are healthy.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {lowStock.slice(0, 6).map((medication: Medication) => (
                  <StockAlertRow key={medication.id} medication={medication} />
                ))}
              </ul>
            )}
          </div>

          <div className="card flex flex-col items-center gap-2 p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
              <Icon name="inventory" size={22} />
            </span>
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              Medication Catalog
            </h3>
            <p className="max-w-[220px] text-xs text-stone-500 dark:text-stone-400">
              Manage stock levels, pricing and the drug catalog for this branch.
            </p>
            <Link to="/pharmacy/medications" className="btn-secondary mt-1 text-sm">
              Open Catalog
            </Link>
          </div>
        </section>
      </div>

      {/* Bottom — dispensing log */}
      <section className="space-y-3" aria-labelledby="dispensing-log-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="dispensing-log-title"
            className="text-lg font-semibold text-stone-900 dark:text-stone-100"
          >
            Dispensing Log
          </h2>
          <Link
            to="/pharmacy/prescriptions"
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-brand-700 hover:underline dark:text-brand-300"
          >
            View all
            <Icon name="arrowRight" size={12} />
          </Link>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500 dark:border-stone-800 dark:bg-stone-800/60 dark:text-stone-400">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Time</th>
                  <th scope="col" className="px-4 py-3 font-medium">Prescription</th>
                  <th scope="col" className="px-4 py-3 font-medium">Patient</th>
                  <th scope="col" className="px-4 py-3 font-medium">Prescriber</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Items</th>
                  <th scope="col" className="px-4 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {prescriptionsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-stone-500 dark:text-stone-400">
                      Loading…
                    </td>
                  </tr>
                ) : dispensed.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-stone-500 dark:text-stone-400">
                      No dispensing activity yet.
                    </td>
                  </tr>
                ) : (
                  dispensed.slice(0, 8).map((prescription: Prescription) => (
                    <tr
                      key={prescription.id}
                      className="transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/40"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-stone-600 dark:text-stone-300">
                        {formatTime(prescription.updated_at)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-stone-700 dark:text-stone-200">
                        RX-{String(prescription.id).padStart(5, '0')}
                      </td>
                      <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
                        Patient #{prescription.patient_id}
                      </td>
                      <td className="px-4 py-3 text-stone-500 dark:text-stone-400">
                        {prescription.doctor?.name ?? `Doctor #${prescription.doctor_id}`}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-stone-700 dark:text-stone-300">
                        {prescription.items?.length ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PrescriptionStatusPill status={prescription.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
