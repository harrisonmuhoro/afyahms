import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';
import { PermissionButton } from '@/components/auth/PermissionButton';
import type { Prescription, PrescriptionItem } from './types';

const PERM_DISPENSE = 'prescriptions.dispense';

/* ─── Status pill (status always paired with an icon + label) ────────────────── */
const STATUS_STYLE: Record<Prescription['status'], string> = {
  pending:
    'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
  dispensed:
    'bg-green-100 text-green-900 dark:bg-green-950/50 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200',
};

export function PrescriptionStatusPill({
  status,
}: {
  status: Prescription['status'];
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        STATUS_STYLE[status],
      )}
    >
      <Icon
        name={status === 'dispensed' ? 'check' : status === 'cancelled' ? 'close' : 'time'}
        size={12}
      />
      {status}
    </span>
  );
}

/* ─── Verification queue card (SCREEN 7 — left column) ───────────────────────── */
interface PrescriptionQueueCardProps {
  prescription: Prescription;
  onDispense: (id: number) => void;
  isDispensing: boolean;
}

export function PrescriptionQueueCard({
  prescription,
  onDispense,
  isDispensing,
}: PrescriptionQueueCardProps): JSX.Element {
  const isPending = prescription.status === 'pending';

  return (
    <article
      className={cn(
        'card relative overflow-hidden p-0',
        isPending && 'border-l-4 border-l-brand-600 dark:border-l-brand-500',
      )}
    >
      {/* Mini identity header */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 bg-stone-50/60 px-4 py-3 dark:border-stone-800 dark:bg-stone-800/40">
        <div className="flex items-center gap-3">
          <span className="avatar-md bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
            <Icon name="user" size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Patient{' '}
              <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                #{prescription.patient_id}
              </code>
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Prescriber: {prescription.doctor?.name ?? `Doctor #${prescription.doctor_id}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-xs font-semibold text-stone-500 dark:text-stone-400">
            RX-{String(prescription.id).padStart(5, '0')}
          </span>
          <PrescriptionStatusPill status={prescription.status} />
        </div>
      </header>

      {/* Itemized drug list */}
      <div className="px-4 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          Items
        </p>
        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
          {(prescription.items ?? []).map((item: PrescriptionItem) => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                  {item.medication?.name ?? `Medication #${item.medication_id}`}
                  {item.medication?.strength !== null &&
                    item.medication?.strength !== undefined && (
                      <span className="ml-2 font-mono text-xs text-stone-500 dark:text-stone-400">
                        {item.medication.strength}
                      </span>
                    )}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {item.dosage_instructions}
                </p>
              </div>
              <span className="shrink-0 rounded bg-stone-100 px-2 py-0.5 font-mono text-xs font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                Qty {item.quantity}
              </span>
            </li>
          ))}
          {(prescription.items ?? []).length === 0 && (
            <li className="py-2 text-xs text-stone-400 dark:text-stone-500">No items listed.</li>
          )}
        </ul>
      </div>

      {/* Prescriber note */}
      {prescription.notes !== null && prescription.notes !== '' && (
        <div className="mx-4 mb-3 flex gap-2 rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/60">
          <Icon
            name="message"
            size={14}
            className="mt-0.5 shrink-0 text-stone-400 dark:text-stone-500"
          />
          <p className="text-xs italic text-stone-600 dark:text-stone-300">
            &ldquo;{prescription.notes}&rdquo;
          </p>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <footer className="flex items-center justify-end gap-2 border-t border-stone-100 px-4 py-3 dark:border-stone-800">
          <PermissionButton
            permission={PERM_DISPENSE}
            explanation="You do not have permission to dispense prescriptions."
            onClick={() => onDispense(prescription.id)}
            disabled={isDispensing}
            className="btn-primary text-sm"
          >
            <Icon name="check" size={16} />
            {isDispensing ? 'Dispensing…' : 'Verify & Dispense'}
          </PermissionButton>
        </footer>
      )}
    </article>
  );
}
