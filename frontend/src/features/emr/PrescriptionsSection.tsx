/**
 * PrescriptionsSection — create & view prescriptions for a visit.
 * Wired to:
 *   GET  /api/v1/pharmacy/prescriptions?patient_id=X (filtered client-side)
 *   POST /api/v1/pharmacy/prescriptions
 *   GET  /api/v1/pharmacy/medications
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import { PermissionButton } from '@/components/auth/PermissionButton';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/cn';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Medication {
  id: number;
  name: string;
  generic_name: string | null;
  dosage_form: string | null;
  strength: string | null;
  stock_quantity: number;
}

interface PrescriptionItem {
  id: number;
  prescription_id: number;
  medication_id: number;
  quantity: number;
  dosage_instructions: string;
  medication: Medication | null;
}

interface Prescription {
  id: number;
  patient_id: number;
  notes: string | null;
  status: 'pending' | 'dispensed' | 'cancelled';
  created_at: string | null;
  doctor: { id: number; name: string } | null;
  items: PrescriptionItem[];
}

interface PrescriptionDraftItem {
  medication_id: string;
  quantity: string;
  dosage_instructions: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pending Dispensing', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  dispensed: { label: 'Dispensed',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelled',          cls: 'bg-surface-container text-tertiary border-outline-variant' },
};

/* ─── API Hooks ──────────────────────────────────────────────────────────── */
function usePrescriptions(enabled: boolean) {
  return useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => httpClient.get<Prescription[]>('/pharmacy/prescriptions').then((r) => r),
    select: (data) => (Array.isArray(data) ? data : []),
    enabled,
  });
}

function useMedications(enabled: boolean) {
  return useQuery({
    queryKey: ['medications'],
    queryFn: () => httpClient.get<Medication[]>('/pharmacy/medications').then((r) => r),
    select: (data) => (Array.isArray(data) ? data : []),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { patient_id: number; notes: string; items: { medication_id: number; quantity: number; dosage_instructions: string }[] }) =>
      httpClient.post<Prescription>('/pharmacy/prescriptions', payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['prescriptions'] }),
  });
}

/* ─── Empty draft item ───────────────────────────────────────────────────── */
function emptyItem(): PrescriptionDraftItem {
  return { medication_id: '', quantity: '1', dosage_instructions: '' };
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function PrescriptionsSection({ patientId }: { patientId: number }): JSX.Element {
  const { hasPermission } = useAuth();
  const canReadPrescriptions = hasPermission('prescriptions.read');
  const canViewStock = hasPermission('pharmacy.view-stock');

  const { data: allPrescriptions = [], isLoading } = usePrescriptions(canReadPrescriptions);
  const { data: medications = [] } = useMedications(canViewStock);
  const createPrescription = useCreatePrescription();

  // Filter to this patient's prescriptions
  const prescriptions = allPrescriptions.filter((p) => p.patient_id === patientId);

  const [showForm, setShowForm] = useState(false);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PrescriptionDraftItem[]>([emptyItem()]);
  const [err, setErr] = useState<string | null>(null);

  const addItem = (): void => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number): void => setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof PrescriptionDraftItem, value: string): void => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async (): Promise<void> => {
    const validItems = items.filter((it) => it.medication_id !== '' && Number(it.quantity) > 0 && it.dosage_instructions.trim() !== '');
    if (validItems.length === 0) {
      setErr('Please add at least one medication with quantity and instructions.');
      return;
    }
    setErr(null);
    try {
      await createPrescription.mutateAsync({
        patient_id: patientId,
        notes,
        items: validItems.map((it) => ({
          medication_id: Number(it.medication_id),
          quantity: Number(it.quantity),
          dosage_instructions: it.dosage_instructions,
        })),
      });
      setShowForm(false);
      setNotes('');
      setItems([emptyItem()]);
    } catch {
      setErr('Failed to create prescription. Please try again.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-body-md flex items-center gap-2 text-on-surface">
          <span className="material-symbols-outlined text-primary text-[20px]">prescriptions</span>
          Prescriptions
        </h3>
        <PermissionButton
          permission="prescriptions.create"
          onClick={() => setShowForm((v) => !v)}
          className="btn-secondary text-[12px] flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[16px]">{showForm ? 'close' : 'add'}</span>
          {showForm ? 'Cancel' : 'New Prescription'}
        </PermissionButton>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mb-5 bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-4">
          <h4 className="text-body-sm font-semibold text-on-surface">New Prescription</h4>

          {/* Line items */}
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                {/* Medication selector */}
                <div className="sm:col-span-4">
                  {idx === 0 && <label className="text-[10px] font-semibold text-on-surface-variant block mb-1">Medication *</label>}
                  <select
                    value={item.medication_id}
                    onChange={(e) => updateItem(idx, 'medication_id', e.target.value)}
                    className="w-full bg-white border border-outline-variant rounded-lg px-2.5 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">— Select —</option>
                    {medications.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}{m.strength ? ` ${m.strength}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Quantity */}
                <div className="sm:col-span-2">
                  {idx === 0 && <label className="text-[10px] font-semibold text-on-surface-variant block mb-1">Qty *</label>}
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                    className="w-full bg-white border border-outline-variant rounded-lg px-2.5 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {/* Dosage instructions */}
                <div className="sm:col-span-5">
                  {idx === 0 && <label className="text-[10px] font-semibold text-on-surface-variant block mb-1">Dosage Instructions *</label>}
                  <input
                    type="text"
                    value={item.dosage_instructions}
                    onChange={(e) => updateItem(idx, 'dosage_instructions', e.target.value)}
                    placeholder="e.g. 1 tab twice daily after meals"
                    className="w-full bg-white border border-outline-variant rounded-lg px-2.5 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {/* Remove */}
                <div className={cn('sm:col-span-1 flex', idx === 0 ? 'sm:pt-5' : '')}>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1.5 text-error hover:bg-error-container rounded-lg transition-colors"
                      aria-label="Remove item"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="text-primary text-[12px] font-semibold flex items-center gap-1 hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Add another medication
          </button>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold text-on-surface-variant block mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-white border border-outline-variant rounded-lg px-3 py-2 text-body-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Additional instructions, allergies to avoid…"
            />
          </div>

          {err !== null && <p className="text-error text-[11px]">{err}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowForm(false)} className="btn-ghost text-[12px]">Cancel</button>
            <PermissionButton
              permission="prescriptions.create"
              onClick={() => void handleSubmit()}
              disabled={createPrescription.isPending}
              className="btn-primary text-[12px]"
            >
              {createPrescription.isPending ? 'Saving...' : 'Issue Prescription'}
            </PermissionButton>
          </div>
        </div>
      )}

      {/* List */}
      {!canReadPrescriptions ? (
        <p className="text-tertiary text-body-sm text-center py-8">You do not have permission to view prescriptions.</p>
      ) : isLoading ? (
        <p className="text-[12px] text-tertiary py-4">Loading prescriptions…</p>
      ) : prescriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-on-surface-variant gap-2">
          <span className="material-symbols-outlined text-[36px] text-outline-variant">medication</span>
          <p className="text-body-sm">No prescriptions for this patient yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => {
            const chip = STATUS_CHIP[rx.status] ?? { label: rx.status, cls: 'bg-surface-container text-tertiary border-outline-variant' };
            return (
              <div key={rx.id} className="border border-outline-variant rounded-xl bg-white overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container-low border-b border-outline-variant">
                  <div className="flex items-center gap-3">
                    <span className="font-data-mono text-[11px] text-tertiary">Rx #{rx.id}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold border', chip.cls)}>{chip.label}</span>
                  </div>
                  <div className="text-[11px] text-tertiary">
                    {rx.doctor !== null && <span>{rx.doctor.name}</span>}
                    {rx.created_at !== null && <span className="ml-2">{new Date(rx.created_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                {/* Items */}
                <div className="divide-y divide-outline-variant">
                  {rx.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
                      <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">pill</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-body-sm text-on-surface">
                            {item.medication?.name ?? 'Unknown'}
                            {item.medication?.strength !== null && item.medication?.strength !== undefined ? ` ${item.medication.strength}` : ''}
                          </span>
                          <span className="text-[11px] text-tertiary bg-surface-container px-1.5 py-0.5 rounded">
                            Qty: {item.quantity}
                          </span>
                          {item.medication?.dosage_form !== null && item.medication?.dosage_form !== undefined && (
                            <span className="text-[10px] text-tertiary capitalize">{item.medication.dosage_form}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-0.5">{item.dosage_instructions}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {rx.notes !== null && (
                  <div className="px-4 py-2 text-[11px] text-on-surface-variant border-t border-outline-variant bg-surface-container-low italic">
                    Note: {rx.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
