/**
 * OrdersSection — renders lab-test and imaging orders for a visit.
 * Wired to real back-end APIs.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import { PermissionButton } from '@/components/auth/PermissionButton';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { Glyph } from '@/components/icons/Glyph';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface LabTest {
  id: number;
  name: string;
  code: string;
  category: string;
  price: number;
  turnaround_minutes: number;
}

interface ImagingStudy {
  id: number;
  name: string;
  code: string;
  modality: string;
  price?: number;
}

type OrderStatus = 'pending' | 'collected' | 'processing' | 'resulted' | 'cancelled' | 'scheduled' | 'acquired';
type Priority = 'routine' | 'urgent' | 'stat';

interface LabOrder {
  id: number;
  public_id: string;
  status: OrderStatus;
  priority: Priority | null;
  clinical_notes: string | null;
  specimen_type: string | null;
  collected_at: string | null;
  resulted_at: string | null;
  created_at: string | null;
  test: LabTest | null;
  ordered_by: { id: number; name: string } | null;
  result: {
    id: number;
    findings: string | null;
    interpretation: string | null;
    value: string | null;
    unit: string | null;
    reference_range: string | null;
    is_critical: boolean;
    verified_at: string | null;
  } | null;
}

interface ImagingOrder {
  id: number;
  public_id: string;
  status: OrderStatus;
  priority: Priority | null;
  clinical_indication: string | null;
  contrast_used: boolean;
  scheduled_at: string | null;
  acquired_at: string | null;
  created_at: string | null;
  study: ImagingStudy | null;
  ordered_by: { id: number; name: string } | null;
  report: { id: number; findings: string | null; verified_at: string | null } | null;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'Pending',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  collected:  { label: 'Collected',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  processing: { label: 'Processing', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  resulted:   { label: 'Resulted',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled:  { label: 'Cancelled',  cls: 'bg-surface-container text-tertiary border-outline-variant' },
  scheduled:  { label: 'Scheduled',  cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  acquired:   { label: 'Acquired',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const PRIORITY_CLS: Record<string, string> = {
  stat:    'bg-red-100 text-red-700 border-red-200',
  urgent:  'bg-orange-100 text-orange-700 border-orange-200',
  routine: 'bg-surface-container text-tertiary border-outline-variant',
};

function StatusChip({ status }: { status: string }): JSX.Element {
  const chip = STATUS_CHIP[status] ?? { label: status, cls: 'bg-surface-container text-tertiary border-outline-variant' };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold border', chip.cls)}>{chip.label}</span>
  );
}

/* ─── API hooks ──────────────────────────────────────────────────────────── */
function useLabOrders(visitId: number) {
  return useQuery({
    queryKey: ['lab-orders', visitId],
    queryFn: () => httpClient.get<{ data: LabOrder[] }>(`/lab/visits/${visitId}/orders`).then((r) => r.data),
    enabled: visitId > 0,
  });
}

function usePlaceLabOrder(visitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { lab_test_id: number; priority: string; clinical_notes: string }) =>
      httpClient.post<{ data: LabOrder }>(`/lab/visits/${visitId}/orders`, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['lab-orders', visitId] }),
  });
}

function useCancelLabOrder(visitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (publicId: string) =>
      httpClient.post<{ data: LabOrder }>(`/lab/orders/${publicId}/cancel`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['lab-orders', visitId] }),
  });
}

function useImagingOrders(visitId: number) {
  return useQuery({
    queryKey: ['imaging-orders', visitId],
    queryFn: () => httpClient.get<{ data: ImagingOrder[] }>(`/radiology/visits/${visitId}/orders`).then((r) => r.data),
    enabled: visitId > 0,
  });
}


function usePlaceImagingOrder(visitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { imaging_study_id: number; priority: string; clinical_indication: string }) =>
      httpClient.post<{ data: ImagingOrder }>(`/radiology/visits/${visitId}/orders`, payload),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['imaging-orders', visitId] }),
  });
}

function useCancelImagingOrder(visitId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (publicId: string) =>
      httpClient.post<{ data: ImagingOrder }>(`/radiology/orders/${publicId}/cancel`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['imaging-orders', visitId] }),
  });
}

/* ─── Lab Orders Panel ───────────────────────────────────────────────────── */
function LabOrdersPanel({ visitId }: { visitId: number }): JSX.Element {
  const { hasPermission } = useAuth();
  const { data: orders = [], isLoading } = useLabOrders(visitId);
  const { data: catalog = [] } = useQuery({
    queryKey: ['lab-catalog'],
    queryFn: () => httpClient.get<{ data: LabTest[] }>('/lab/tests').then((r) => r.data),
    enabled: hasPermission('lab.order'),
    staleTime: 5 * 60 * 1000,
  });
  const placeOrder = usePlaceLabOrder(visitId);
  const cancelOrder = useCancelLabOrder(visitId);

  const [showForm, setShowForm] = useState(false);
  const [testId, setTestId] = useState('');
  const [priority, setPriority] = useState('routine');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (!testId) { setErr('Please select a test.'); return; }
    setErr(null);
    try {
      await placeOrder.mutateAsync({ lab_test_id: Number(testId), priority, clinical_notes: notes });
      setShowForm(false);
      setTestId(''); setPriority('routine'); setNotes('');
    } catch {
      setErr('Failed to place order. Please try again.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-body-md flex items-center gap-2 text-on-surface">
          <Glyph name="science" size={20} className="text-primary" />
          Laboratory Tests
        </h3>
        <PermissionButton
          permission="lab.order"
          onClick={() => setShowForm((v) => !v)}
          className="btn-secondary text-[12px] flex items-center gap-1"
        >
          <Glyph name={showForm ? 'close' : 'add'} size={16} />
          {showForm ? 'Cancel' : 'Order Test'}
        </PermissionButton>
      </div>

      {showForm && (
        <div className="mb-4 bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Test *</label>
              <select
                value={testId}
                onChange={(e) => setTestId(e.target.value)}
                className="w-full bg-white border border-outline-variant rounded-lg px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Select test —</option>
                {catalog.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-white border border-outline-variant rounded-lg px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Clinical Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-white border border-outline-variant rounded-lg px-3 py-2 text-body-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Reason for ordering, relevant history..."
            />
          </div>
          {err !== null && <p className="text-error text-[11px]">{err}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost text-[12px]">Cancel</button>
            <PermissionButton
              permission="lab.order"
              onClick={() => void handleSubmit()}
              disabled={placeOrder.isPending}
              className="btn-primary text-[12px]"
            >
              {placeOrder.isPending ? 'Placing...' : 'Place Order'}
            </PermissionButton>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-[12px] text-tertiary py-4">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-on-surface-variant gap-2">
          <Glyph name="biotech" size={28} className="text-outline-variant" />
          <p className="text-body-sm">No lab orders yet for this visit.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="border border-outline-variant rounded-xl p-3 bg-white hover:bg-surface-container-low transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-body-sm text-on-surface">{order.test?.name ?? 'Unknown Test'}</span>
                    {order.test?.code !== undefined && (
                      <span className="font-data-mono text-[10px] text-tertiary bg-surface-container px-1.5 py-0.5 rounded">{order.test.code}</span>
                    )}
                    <StatusChip status={order.status} />
                    {order.priority !== null && order.priority !== undefined && (
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase', PRIORITY_CLS[order.priority] ?? 'bg-surface-container text-tertiary border-outline-variant')}>
                        {order.priority}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-tertiary flex-wrap">
                    {order.test?.category !== undefined && <span className="capitalize">{order.test.category}</span>}
                    {order.test?.turnaround_minutes !== undefined && <span>TAT: {order.test.turnaround_minutes}min</span>}
                    {order.ordered_by !== null && <span>By: {order.ordered_by.name}</span>}
                    {order.created_at !== null && <span>{new Date(order.created_at).toLocaleDateString()}</span>}
                  </div>
                  {order.clinical_notes !== null && (
                    <p className="text-[11px] text-on-surface-variant mt-1 italic">"{order.clinical_notes}"</p>
                  )}
                  {order.result !== null && (
                    <div className={cn('mt-2 p-2 rounded-lg text-[11px]', order.result.is_critical ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200')}>
                      {order.result.is_critical && (
                        <p className="font-bold text-red-700 mb-1">⚠ CRITICAL RESULT</p>
                      )}
                      <p className="font-semibold text-on-surface">{order.result.value} {order.result.unit}</p>
                      {order.result.reference_range !== null && <p className="text-tertiary">Reference: {order.result.reference_range}</p>}
                      {order.result.findings !== null && <p className="text-on-surface-variant mt-0.5">{order.result.findings}</p>}
                      {order.result.verified_at !== null && <p className="text-tertiary mt-0.5">Verified {new Date(order.result.verified_at).toLocaleString()}</p>}
                    </div>
                  )}
                </div>
                {order.status === 'pending' && (
                  <PermissionButton
                    permission="lab.order"
                    onClick={() => void cancelOrder.mutateAsync(order.public_id)}
                    disabled={cancelOrder.isPending}
                    className="text-error text-[11px] hover:bg-error-container px-2 py-1 rounded-lg transition-colors shrink-0"
                  >
                    Cancel
                  </PermissionButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Imaging Orders Panel ───────────────────────────────────────────────── */
function ImagingOrdersPanel({ visitId }: { visitId: number }): JSX.Element {
  const { hasPermission } = useAuth();
  const { data: orders = [], isLoading } = useImagingOrders(visitId);
  const { data: catalog = [] } = useQuery({
    queryKey: ['imaging-catalog'],
    queryFn: () => httpClient.get<{ data: ImagingStudy[] }>('/radiology/studies').then((r) => r.data),
    enabled: hasPermission('radiology.order'),
    staleTime: 5 * 60 * 1000,
  });
  const placeOrder = usePlaceImagingOrder(visitId);
  const cancelOrder = useCancelImagingOrder(visitId);

  const [showForm, setShowForm] = useState(false);
  const [studyId, setStudyId] = useState('');
  const [priority, setPriority] = useState('routine');
  const [indication, setIndication] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    if (!studyId) { setErr('Please select an imaging study.'); return; }
    setErr(null);
    try {
      await placeOrder.mutateAsync({ imaging_study_id: Number(studyId), priority, clinical_indication: indication });
      setShowForm(false);
      setStudyId(''); setPriority('routine'); setIndication('');
    } catch {
      setErr('Failed to place order. Please try again.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-body-md flex items-center gap-2 text-on-surface">
          <Glyph name="radiology" size={20} className="text-primary" />
          Imaging / Radiology
        </h3>
        <PermissionButton
          permission="radiology.order"
          onClick={() => setShowForm((v) => !v)}
          className="btn-secondary text-[12px] flex items-center gap-1"
        >
          <Glyph name={showForm ? 'close' : 'add'} size={16} />
          {showForm ? 'Cancel' : 'Order Study'}
        </PermissionButton>
      </div>

      {showForm && (
        <div className="mb-4 bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Study *</label>
              <select
                value={studyId}
                onChange={(e) => setStudyId(e.target.value)}
                className="w-full bg-white border border-outline-variant rounded-lg px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">— Select study —</option>
                {catalog.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.modality})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-white border border-outline-variant rounded-lg px-3 py-2 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="stat">STAT</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant block mb-1">Clinical Indication</label>
            <textarea
              value={indication}
              onChange={(e) => setIndication(e.target.value)}
              rows={2}
              className="w-full bg-white border border-outline-variant rounded-lg px-3 py-2 text-body-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Reason for imaging…"
            />
          </div>
          {err !== null && <p className="text-error text-[11px]">{err}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost text-[12px]">Cancel</button>
            <PermissionButton
              permission="radiology.order"
              onClick={() => void handleSubmit()}
              disabled={placeOrder.isPending}
              className="btn-primary text-[12px]"
            >
              {placeOrder.isPending ? 'Placing...' : 'Place Order'}
            </PermissionButton>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-[12px] text-tertiary py-4">Loading imaging orders…</p>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center text-on-surface-variant gap-2">
          <Glyph name="radiology" size={28} className="text-outline-variant" />
          <p className="text-body-sm">No imaging orders yet for this visit.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="border border-outline-variant rounded-xl p-3 bg-white hover:bg-surface-container-low transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-body-sm text-on-surface">{order.study?.name ?? 'Unknown Study'}</span>
                    {order.study?.modality !== undefined && (
                      <span className="font-data-mono text-[10px] text-tertiary bg-surface-container px-1.5 py-0.5 rounded">{order.study.modality}</span>
                    )}
                    <StatusChip status={order.status} />
                    {order.priority !== null && order.priority !== undefined && (
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase', PRIORITY_CLS[order.priority] ?? 'bg-surface-container text-tertiary border-outline-variant')}>
                        {order.priority}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-tertiary flex-wrap">
                    {order.ordered_by !== null && <span>By: {order.ordered_by.name}</span>}
                    {order.scheduled_at !== null && <span>Scheduled: {new Date(order.scheduled_at).toLocaleString()}</span>}
                    {order.created_at !== null && <span>{new Date(order.created_at).toLocaleDateString()}</span>}
                  </div>
                  {order.clinical_indication !== null && (
                    <p className="text-[11px] text-on-surface-variant mt-1 italic">"{order.clinical_indication}"</p>
                  )}
                  {order.report !== null && (
                    <div className="mt-2 p-2 rounded-lg text-[11px] bg-emerald-50 border border-emerald-200">
                      {order.report.findings !== null && <p className="text-on-surface-variant">{order.report.findings}</p>}
                      {order.report.verified_at !== null && <p className="text-tertiary mt-0.5">Verified {new Date(order.report.verified_at).toLocaleString()}</p>}
                    </div>
                  )}
                </div>
                {order.status === 'pending' && (
                  <PermissionButton
                    permission="radiology.order"
                    onClick={() => void cancelOrder.mutateAsync(order.public_id)}
                    disabled={cancelOrder.isPending}
                    className="text-error text-[11px] hover:bg-error-container px-2 py-1 rounded-lg transition-colors shrink-0"
                  >
                    Cancel
                  </PermissionButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main export ────────────────────────────────────────────────────────── */
export function OrdersSection({ visitId }: { visitId: number }): JSX.Element {
  const { hasPermission } = useAuth();

  return (
    <div className="space-y-6">
      {hasPermission('lab.read') && <LabOrdersPanel visitId={visitId} />}
      {hasPermission('lab.read') && hasPermission('radiology.read') && <hr className="border-outline-variant" />}
      {hasPermission('radiology.read') && <ImagingOrdersPanel visitId={visitId} />}
      {!hasPermission('lab.read') && !hasPermission('radiology.read') && (
        <p className="text-tertiary text-body-sm text-center py-8">You do not have permission to view orders.</p>
      )}
    </div>
  );
}
