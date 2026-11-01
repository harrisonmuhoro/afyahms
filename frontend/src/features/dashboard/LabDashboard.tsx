import { useMemo, useState } from 'react';
import { useLabWorklist, useCollectSample, useStartProcessing, useRecordResult, useVerifyResult } from '@/features/lab/api';
import type { LabInterpretation, LabOrder, LabOrderStatus, LabPriority } from '@/features/lab/types';
import { Glyph } from '@/components/icons/Glyph';

const STATUS_CHIP: Record<LabOrderStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-surface-container-highest text-outline' },
  collected: { label: 'Collected', className: 'bg-tertiary-container/20 text-on-tertiary-fixed-variant' },
  processing: { label: 'Processing', className: 'bg-primary-container/10 text-primary' },
  resulted: { label: 'Resulted', className: 'bg-secondary-container/10 text-secondary' },
  cancelled: { label: 'Cancelled', className: 'bg-error-container/20 text-error' },
};

function PriorityBadge({ priority }: { priority: LabPriority }): JSX.Element {
  if (priority === 'stat') {
    return (
      <span className="flex items-center gap-1.5 text-error font-bold text-xs animate-pulse">
        <Glyph name="error" size={14} />
        STAT
      </span>
    );
  }
  if (priority === 'urgent') {
    return (
      <span className="flex items-center gap-1.5 text-orange-600 font-bold text-xs">
        <Glyph name="warning" size={14} /> Urgent
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-outline font-bold text-xs">
      <Glyph name="schedule" size={14} /> Routine
    </span>
  );
}

function orderTime(order: LabOrder): string {
  if (order.created_at === null) return '—';
  return new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Lab technician dashboard wired to the Laboratory module worklist:
 * KPI row from live counts, prioritised worklist table with collect/process
 * actions, and a result-entry panel with critical-value flag + verify step.
 */
export function LabDashboard(): JSX.Element {
  const { data: orders, isLoading, error } = useLabWorklist();
  const collect = useCollectSample();
  const process = useStartProcessing();
  const recordResult = useRecordResult();
  const verifyResult = useVerifyResult();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [findings, setFindings] = useState('');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('');
  const [refRange, setRefRange] = useState('');
  const [interpretation, setInterpretation] = useState<LabInterpretation>('normal');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const selected = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId],
  );

  const statPending = orders.filter((o) => o.priority === 'stat' && o.status !== 'resulted').length;
  const awaitingCollection = orders.filter((o) => o.status === 'pending').length;
  const inAnalysis = orders.filter((o) => o.status === 'processing').length;
  const awaitingVerify = orders.filter((o) => o.status === 'resulted' && o.result !== null && o.result.verified_at === null).length;

  const resetForm = (): void => {
    setFindings('');
    setValue('');
    setUnit('');
    setRefRange('');
    setInterpretation('normal');
    setNotes('');
  };

  const selectOrder = (order: LabOrder): void => {
    setSelectedId(order.id);
    setFeedback(null);
    resetForm();
  };

  const onAdvance = async (order: LabOrder): Promise<void> => {
    setFeedback(null);
    try {
      if (order.status === 'pending') {
        await collect.mutateAsync(order.id);
        setFeedback(`Sample for ${order.test?.name ?? 'order'} marked collected.`);
      } else if (order.status === 'collected') {
        await process.mutateAsync(order.id);
        setFeedback(`${order.test?.name ?? 'Order'} moved to analysis.`);
      }
    } catch {
      setFeedback('Action failed — the order may have changed. List refreshes automatically.');
    }
  };

  const onSubmitResult = async (): Promise<void> => {
    if (selected === null || findings.trim() === '') return;
    setFeedback(null);
    try {
      await recordResult.mutateAsync({
        orderId: selected.id,
        payload: {
          findings: findings.trim(),
          interpretation,
          ...(value.trim() !== '' ? { value: value.trim() } : {}),
          ...(unit.trim() !== '' ? { unit: unit.trim() } : {}),
          ...(refRange.trim() !== '' ? { reference_range: refRange.trim() } : {}),
          ...(interpretation === 'critical' ? { is_critical: true } : {}),
          ...(notes.trim() !== '' ? { notes: notes.trim() } : {}),
        },
      });
      setFeedback('Result recorded — awaiting verification.');
      resetForm();
    } catch {
      setFeedback('Could not record result. Check the order status and try again.');
    }
  };

  const onVerify = async (): Promise<void> => {
    if (selected?.result == null) return;
    setFeedback(null);
    try {
      await verifyResult.mutateAsync(selected.result.id);
      setFeedback('Result verified and released to the ordering doctor.');
    } catch {
      setFeedback('Verification failed.');
    }
  };

  const canAdvance = (o: LabOrder): boolean => o.status === 'pending' || o.status === 'collected';
  const advanceLabel = (o: LabOrder): string => (o.status === 'pending' ? 'Collect' : 'Analyse');

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-headline-lg font-headline-lg text-on-surface">Laboratory worklist</h2>
        <p className="text-body-md text-on-surface-variant">
          Collect samples, run analyses and verify results for this branch.
        </p>
      </div>
      {/* Dashboard Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <div className="bg-surface border border-outline-variant p-md rounded-xl shadow-card">
          <p className="text-label-caps text-outline uppercase">Awaiting Collection</p>
          <div className="flex items-end justify-between mt-2">
            <span className="text-headline-lg font-headline-lg text-on-surface">
              {isLoading ? '…' : awaitingCollection}
            </span>
            <Glyph name="colorize" className="text-tertiary" />
          </div>
        </div>
        <div className="bg-surface border border-outline-variant p-md rounded-xl shadow-card">
          <p className="text-label-caps text-outline uppercase">STAT Pending</p>
          <div className="flex items-end justify-between mt-2">
            <span className={`text-headline-lg font-headline-lg ${statPending > 0 ? 'text-error' : 'text-on-surface'}`}>
              {isLoading ? '…' : statPending}
            </span>
            {statPending > 0 && (
              <span className="text-xs font-semibold text-error bg-error-container/20 px-2 py-0.5 rounded-full">
                High Priority
              </span>
            )}
          </div>
        </div>
        <div className="bg-surface border border-outline-variant p-md rounded-xl shadow-card">
          <p className="text-label-caps text-outline uppercase">In Analysis</p>
          <div className="flex items-end justify-between mt-2">
            <span className="text-headline-lg font-headline-lg text-on-surface">{isLoading ? '…' : inAnalysis}</span>
            <Glyph name="biotech" className="text-primary" />
          </div>
        </div>
        <div className="bg-surface border border-outline-variant p-md rounded-xl shadow-card">
          <p className="text-label-caps text-outline uppercase">Pending Verification</p>
          <div className="flex items-end justify-between mt-2">
            <span className="text-headline-lg font-headline-lg text-on-surface">{isLoading ? '…' : awaitingVerify}</span>
            <Glyph name="verified" className="text-secondary" />
          </div>
        </div>
      </div>

      {feedback !== null && (
        <div role="status" className="bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 text-body-sm text-on-surface">
          {feedback}
        </div>
      )}

      {/* Main Work Area */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Lab Worklist */}
        <section className="col-span-12 xl:col-span-8 bg-surface border border-outline-variant rounded-xl shadow-card overflow-hidden">
          <div className="p-md border-b border-outline-variant flex justify-between items-center">
            <h2 className="text-headline-md font-headline-md text-on-surface flex items-center gap-2">
              <Glyph name="format_list_bulleted" className="text-primary" /> Lab Worklist
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface">
                <tr className="text-label-caps text-outline border-b border-outline-variant">
                  <th className="px-md py-3 font-semibold">Priority</th>
                  <th className="px-md py-3 font-semibold">Order</th>
                  <th className="px-md py-3 font-semibold">Test Name</th>
                  <th className="px-md py-3 font-semibold">Specimen</th>
                  <th className="px-md py-3 font-semibold">Ordered</th>
                  <th className="px-md py-3 font-semibold">Status</th>
                  <th className="px-md py-3 font-semibold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-md py-10 text-center text-body-md text-outline">
                      Loading worklist…
                    </td>
                  </tr>
                ) : error !== null ? (
                  <tr>
                    <td colSpan={7} className="px-md py-10 text-center text-body-md text-outline">
                      Lab service unavailable.
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-md py-10 text-center">
                      <Glyph name="labs" size={28} className="text-outline-variant" />
                      <p className="mt-2 text-body-md text-outline">No active lab orders.</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const chip = STATUS_CHIP[order.status];
                    const active = order.id === selectedId;
                    return (
                      <tr
                        key={order.id}
                        className={`transition-colors cursor-pointer ${
                          active ? 'bg-primary-container/5' : 'hover:bg-surface-container-low'
                        }`}
                        onClick={() => selectOrder(order)}
                      >
                        <td className="px-md py-4">
                          <PriorityBadge priority={order.priority} />
                        </td>
                        <td className="px-md py-4">
                          <div className="font-semibold text-on-surface">Visit #{order.visit_id}</div>
                          <div className="text-body-sm text-outline font-data-mono">
                            {order.public_id.slice(0, 8).toUpperCase()}
                          </div>
                        </td>
                        <td className="px-md py-4 text-on-surface font-medium">
                          {order.test?.name ?? '—'}
                          {order.result?.is_critical === true && (
                            <span className="ml-2 inline-flex items-center gap-1 text-error text-[11px] font-bold uppercase">
                              <Glyph name="emergency_home" size={13} />
                              Critical
                            </span>
                          )}
                        </td>
                        <td className="px-md py-4 font-data-mono text-outline">{order.specimen_type ?? '—'}</td>
                        <td className="px-md py-4 text-body-sm">{orderTime(order)}</td>
                        <td className="px-md py-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${chip.className}`}>
                            {chip.label}
                          </span>
                        </td>
                        <td className="px-md py-4 text-right">
                          {canAdvance(order) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void onAdvance(order);
                              }}
                              disabled={collect.isPending || process.isPending}
                              className="text-primary text-body-sm font-semibold px-2 py-1 rounded hover:bg-primary/5 transition-colors disabled:opacity-50"
                            >
                              {advanceLabel(order)}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Results Entry Form */}
        <section className="col-span-12 xl:col-span-4 space-y-gutter">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-card p-md">
            <div className="flex justify-between items-center mb-md">
              <h2 className="text-headline-md font-headline-md text-on-surface">Result Entry</h2>
              {selected !== null && (
                <span className="text-xs font-semibold bg-primary-container/10 text-primary px-2 py-1 rounded font-data-mono">
                  {selected.test?.code ?? selected.public_id.slice(0, 8).toUpperCase()}
                </span>
              )}
            </div>

            {selected === null ? (
              <div className="py-10 text-center">
                <Glyph name="lab_profile" size={28} className="text-outline-variant" />
                <p className="mt-2 text-body-md text-outline">Select an order from the worklist.</p>
              </div>
            ) : selected.status === 'resulted' && selected.result !== null ? (
              <div className="space-y-md">
                <div className="p-3 bg-surface-container-low rounded-lg space-y-1">
                  <p className="text-body-sm">
                    <span className="font-semibold">Findings:</span> {selected.result.findings}
                  </p>
                  {selected.result.value !== null && (
                    <p className="text-body-sm font-data-mono">
                      {selected.result.value} {selected.result.unit ?? ''}
                      {selected.result.reference_range !== null && (
                        <span className="text-outline"> (Ref: {selected.result.reference_range})</span>
                      )}
                    </p>
                  )}
                </div>
                {selected.result.is_critical && (
                  <div className="p-3 bg-error-container/10 border border-error/20 rounded-lg">
                    <span className="text-[11px] font-bold text-error uppercase flex items-center gap-1">
                      <Glyph name="emergency_home" size={14} />
                      Critical value — notify ordering doctor immediately
                    </span>
                  </div>
                )}
                {selected.result.verified_at === null ? (
                  <button
                    type="button"
                    onClick={() => void onVerify()}
                    disabled={verifyResult.isPending}
                    className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Glyph name="verified" size={18} />
                    Verify &amp; Release to Doctor
                  </button>
                ) : (
                  <p className="text-body-sm text-secondary font-semibold flex items-center gap-1.5">
                    <Glyph name="check_circle" size={16} />
                    Verified {selected.result.verified_by !== null ? `by ${selected.result.verified_by.name}` : ''}
                  </p>
                )}
              </div>
            ) : selected.status !== 'processing' ? (
              <p className="py-6 text-body-md text-outline text-center">
                Order must be in analysis before entering results.
                {canAdvance(selected) && ' Use the worklist action to advance it.'}
              </p>
            ) : (
              <div className="space-y-md">
                <div>
                  <label htmlFor="lab-findings" className="block text-body-sm font-semibold text-on-surface mb-1.5">
                    Findings
                  </label>
                  <textarea
                    id="lab-findings"
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    rows={2}
                    placeholder="Describe the result…"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="lab-value" className="block text-body-sm font-semibold text-on-surface mb-1.5">
                      Value
                    </label>
                    <input
                      id="lab-value"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="245"
                    />
                  </div>
                  <div>
                    <label htmlFor="lab-unit" className="block text-body-sm font-semibold text-on-surface mb-1.5">
                      Unit
                    </label>
                    <input
                      id="lab-unit"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="mg/dL"
                    />
                  </div>
                  <div>
                    <label htmlFor="lab-ref" className="block text-body-sm font-semibold text-on-surface mb-1.5">
                      Ref. range
                    </label>
                    <input
                      id="lab-ref"
                      value={refRange}
                      onChange={(e) => setRefRange(e.target.value)}
                      className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-sm focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="< 200"
                    />
                  </div>
                </div>
                <div>
                  <span className="block text-body-sm font-semibold text-on-surface mb-1.5">Interpretation</span>
                  <div className="flex gap-2" role="radiogroup" aria-label="Interpretation">
                    {(['normal', 'abnormal', 'critical'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        role="radio"
                        aria-checked={interpretation === level}
                        onClick={() => setInterpretation(level)}
                        className={`flex-1 px-3 py-2 rounded-lg text-body-sm font-semibold border transition-all capitalize ${
                          interpretation === level
                            ? level === 'critical'
                              ? 'bg-error text-white border-error'
                              : level === 'abnormal'
                                ? 'bg-orange-600 text-white border-orange-600'
                                : 'bg-primary text-white border-primary'
                            : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                {interpretation === 'critical' && (
                  <div className="p-3 bg-error-container/10 border border-error/20 rounded-lg">
                    <span className="text-[11px] font-bold text-error uppercase">Critical value</span>
                    <p className="text-body-sm text-on-error-container mt-0.5">
                      This result will be flagged critical and requires immediate physician notification after
                      verification.
                    </p>
                  </div>
                )}
                <div>
                  <label htmlFor="lab-notes" className="block text-body-sm font-semibold text-on-surface mb-1.5">
                    Observations / Remarks
                  </label>
                  <textarea
                    id="lab-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    placeholder="Sample was slightly lipemic…"
                    rows={3}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void onSubmitResult()}
                  disabled={findings.trim() === '' || recordResult.isPending}
                  className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold active:scale-95 transition-transform disabled:opacity-50"
                >
                  {recordResult.isPending ? 'Submitting…' : 'Submit Result'}
                </button>
              </div>
            )}
          </div>

          {/* Visual QC Status — no QC backend yet */}
          <div className="bg-surface border border-outline-variant rounded-xl shadow-card overflow-hidden">
            <div className="p-md bg-surface-container-low border-b border-outline-variant">
              <h3 className="text-label-caps font-label-caps text-outline uppercase">DAILY QC TRENDS</h3>
            </div>
            <div className="p-md py-8 text-center">
              <Glyph name="monitoring" size={24} className="text-outline-variant" />
              <p className="mt-2 text-body-sm text-outline">
                Quality-control trends will appear here once analyzer QC data is connected.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
