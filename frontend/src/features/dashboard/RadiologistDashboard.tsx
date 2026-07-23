import { useMemo, useState } from 'react';
import {
  useImagingWorklist,
  useMarkAcquired,
  useSaveReport,
  useFinalizeReport,
} from '@/features/radiology/api';
import type { ImagingOrder, ImagingOrderStatus } from '@/features/radiology/types';

const MODALITY_FILTERS = ['ALL', 'XR', 'CT', 'MRI', 'US'] as const;

const STATUS_LABEL: Record<ImagingOrderStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  acquired: 'Acquired',
  reported: 'Reported',
  cancelled: 'Cancelled',
};

function timeAgo(iso: string | null): string {
  if (iso === null) return '—';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Radiologist dashboard wired to the Radiology module worklist: modality-
 * filtered worklist rail, dark viewer placeholder with live study overlay,
 * and a structured report builder (save draft → finalize) with a critical-
 * finding flag.
 */
export function RadiologistDashboard(): JSX.Element {
  const { data: orders, isLoading, error } = useImagingWorklist();
  const markAcquired = useMarkAcquired();
  const saveReport = useSaveReport();
  const finalizeReport = useFinalizeReport();

  const [modality, setModality] = useState<(typeof MODALITY_FILTERS)[number]>('ALL');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [technique, setTechnique] = useState('');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [isCritical, setIsCritical] = useState(false);
  const [criticalNotes, setCriticalNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const worklist = useMemo(() => {
    const active = orders.filter((o) => o.status !== 'cancelled');
    if (modality === 'ALL') return active;
    return active.filter((o) => (o.study?.modality ?? '').toUpperCase().startsWith(modality));
  }, [orders, modality]);

  const selected = useMemo(() => orders.find((o) => o.id === selectedId) ?? null, [orders, selectedId]);
  const unreported = orders.filter((o) => o.status === 'acquired').length;

  const selectOrder = (order: ImagingOrder): void => {
    setSelectedId(order.id);
    setFeedback(null);
    if (order.report !== null) {
      setTechnique(order.report.technique);
      setFindings(order.report.findings);
      setImpression(order.report.impression);
      setIsCritical(order.report.is_critical);
      setCriticalNotes(order.report.critical_notes ?? '');
    } else {
      setTechnique('');
      setFindings('');
      setImpression('');
      setIsCritical(false);
      setCriticalNotes('');
    }
  };

  const onSaveDraft = async (): Promise<void> => {
    if (selected === null || technique.trim() === '' || findings.trim() === '' || impression.trim() === '') {
      setFeedback('Technique, findings and impression are all required.');
      return;
    }
    setFeedback(null);
    try {
      await saveReport.mutateAsync({
        orderId: selected.id,
        payload: {
          technique: technique.trim(),
          findings: findings.trim(),
          impression: impression.trim(),
          ...(isCritical ? { is_critical: true, critical_notes: criticalNotes.trim() || undefined } : {}),
        },
      });
      setFeedback('Draft saved.');
    } catch {
      setFeedback('Could not save the report — check the study status.');
    }
  };

  const onFinalize = async (): Promise<void> => {
    if (selected?.report == null) {
      setFeedback('Save a draft first, then finalize.');
      return;
    }
    setFeedback(null);
    try {
      await finalizeReport.mutateAsync(selected.report.id);
      setFeedback('Report signed and finalized.');
    } catch {
      setFeedback('Finalize failed — the report may already be final.');
    }
  };

  const onAcquire = async (order: ImagingOrder): Promise<void> => {
    setFeedback(null);
    try {
      await markAcquired.mutateAsync(order.id);
      setFeedback(`${order.study?.name ?? 'Study'} marked acquired.`);
    } catch {
      setFeedback('Could not mark the study acquired.');
    }
  };

  const canReport = selected !== null && (selected.status === 'acquired' || selected.status === 'reported');
  const reportIsFinal = selected?.report !== null && selected?.report !== undefined && selected.report.status !== 'draft';

  return (
    <div className="flex-1 overflow-hidden p-md grid grid-cols-12 gap-md bg-background min-h-[calc(100vh-64px)]">
      {/* Left Column: Worklist */}
      <div className="col-span-12 xl:col-span-3 flex flex-col gap-md h-full overflow-hidden">
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm flex flex-col h-full max-h-[800px]">
          <div className="p-md border-b border-outline-variant flex items-center justify-between">
            <h2 className="font-headline-md text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">list_alt</span>
              Worklist
            </h2>
            <span className="text-label-caps bg-primary-container/20 text-primary px-2 py-1 rounded">
              {isLoading ? '…' : `${worklist.length} ACTIVE`}
            </span>
          </div>
          <div className="p-3 bg-surface-container-lowest flex gap-2 border-b border-outline-variant overflow-x-auto">
            {MODALITY_FILTERS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModality(m)}
                aria-pressed={modality === m}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                  modality === m
                    ? 'bg-primary text-white'
                    : 'hover:bg-surface-container text-on-surface-variant'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="p-md text-body-md text-on-surface-variant text-center py-8">Loading worklist…</p>
            ) : error !== null ? (
              <p className="p-md text-body-md text-on-surface-variant text-center py-8">
                Radiology service unavailable.
              </p>
            ) : worklist.length === 0 ? (
              <div className="p-md text-center py-8">
                <span className="material-symbols-outlined text-[32px] text-outline-variant">radiology</span>
                <p className="mt-2 text-body-md text-on-surface-variant">No active imaging orders.</p>
              </div>
            ) : (
              worklist.map((order) => {
                const critical = order.priority === 'stat' || order.report?.is_critical === true;
                const active = order.id === selectedId;
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => selectOrder(order)}
                    className={`w-full text-left p-md border-b border-outline-variant cursor-pointer transition-all border-l-4 ${
                      active
                        ? 'bg-primary-container/10 border-l-primary'
                        : critical
                          ? 'bg-error-container/5 hover:bg-error-container/10 border-l-error'
                          : 'hover:bg-surface-container-low border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span
                        className={`text-label-caps font-bold flex items-center gap-1 ${
                          critical ? 'text-error' : active ? 'text-primary' : 'text-tertiary'
                        }`}
                      >
                        {critical && <span className="material-symbols-outlined text-[14px]">warning</span>}
                        {order.priority.toUpperCase()}
                      </span>
                      <span className="text-data-mono text-[11px] text-on-surface-variant">
                        {timeAgo(order.created_at)}
                      </span>
                    </div>
                    <h3 className="font-bold text-on-surface">Visit #{order.visit_id}</h3>
                    <p className="text-body-sm text-on-surface-variant">
                      {order.study?.name ?? 'Study'} | {order.public_id.slice(0, 8).toUpperCase()}
                    </p>
                    <div className="mt-2 flex gap-2 items-center">
                      <span className="text-[10px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant">
                        {STATUS_LABEL[order.status]}
                      </span>
                      {order.study !== null && (
                        <span className="text-[10px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded border border-outline-variant">
                          {order.study.modality}
                        </span>
                      )}
                      {(order.status === 'pending' || order.status === 'scheduled') && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            void onAcquire(order);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              void onAcquire(order);
                            }
                          }}
                          className="ml-auto text-[10px] font-bold text-primary hover:underline"
                        >
                          Mark acquired
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Middle Column: Image Viewer */}
      <div className="col-span-12 xl:col-span-6 flex flex-col gap-md h-full overflow-hidden">
        <div className="bg-inverse-surface rounded-xl flex-1 flex flex-col overflow-hidden border border-outline relative min-h-[500px]">
          {/* Viewer Toolbar */}
          <div className="h-12 bg-black/40 backdrop-blur-md flex items-center justify-between px-md border-b border-white/10 z-10">
            <div className="flex items-center gap-1">
              {(['zoom_in', 'pan_tool', 'contrast', 'straighten'] as const).map((tool) => (
                <button
                  key={tool}
                  type="button"
                  disabled
                  title="Viewer tools available when PACS is connected"
                  className="p-1.5 rounded text-white/40 cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px]">{tool}</span>
                </button>
              ))}
            </div>
            <span className="text-data-mono text-[11px] text-white/60">
              {unreported} unreported {unreported === 1 ? 'study' : 'studies'}
            </span>
          </div>
          {/* Main Viewer Canvas */}
          <div
            className="flex-1 relative flex items-center justify-center overflow-hidden bg-black"
            style={{ backgroundImage: 'radial-gradient(#3d4947 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          >
            {selected !== null && (
              <>
                <div className="absolute top-md left-md text-data-mono text-[12px] text-primary-fixed leading-tight z-20">
                  VISIT: #{selected.visit_id}
                  <br />
                  ORDER: {selected.public_id.slice(0, 8).toUpperCase()}
                  <br />
                  BY: {selected.ordered_by?.name ?? '—'}
                </div>
                <div className="absolute top-md right-md text-data-mono text-[12px] text-primary-fixed text-right leading-tight z-20">
                  PROC: {selected.study?.name?.toUpperCase() ?? '—'}
                  <br />
                  MODALITY: {selected.study?.modality ?? '—'}
                  <br />
                  {selected.acquired_at !== null
                    ? `ACQ: ${new Date(selected.acquired_at).toLocaleString('en-GB')}`
                    : 'NOT ACQUIRED'}
                </div>
              </>
            )}
            <div className="w-full h-full flex items-center justify-center p-md">
              <div className="w-full h-full max-w-[400px] border border-white/5 shadow-2xl flex items-center justify-center text-white/50 bg-white/5 text-body-sm text-center px-4">
                {selected === null
                  ? 'Select a study from the worklist'
                  : 'PACS viewer integration pending — images not yet available'}
              </div>
            </div>
          </div>
          {/* Series Preview Strip */}
          <div className="h-24 flex gap-sm overflow-x-auto pb-1 p-2 bg-black/90">
            <div className="h-full w-24 flex-shrink-0 bg-inverse-surface border-2 border-primary rounded-lg overflow-hidden relative cursor-pointer">
              <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/30 text-[10px]">IMG 1</div>
              <span className="absolute bottom-1 right-1 text-[9px] text-white bg-black/60 px-1 rounded">PA</span>
            </div>
            <div className="h-full w-24 flex-shrink-0 bg-inverse-surface border border-outline rounded-lg overflow-hidden relative cursor-pointer hover:border-primary/50 transition-colors">
              <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/30 text-[10px]">IMG 2</div>
              <span className="absolute bottom-1 right-1 text-[9px] text-white bg-black/60 px-1 rounded">LAT</span>
            </div>
            <div className="h-full w-24 flex-shrink-0 bg-inverse-surface border border-outline rounded-lg overflow-hidden relative cursor-pointer hover:border-primary/50 transition-colors">
              <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/30 text-[10px]">PREV</div>
              <span className="absolute bottom-1 right-1 text-[9px] text-white bg-black/60 px-1 rounded">PREV</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Reporting & Queue */}
      <div className="col-span-12 xl:col-span-3 flex flex-col gap-md h-full overflow-hidden">
        {feedback !== null && (
          <div
            role="status"
            className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 text-body-sm text-on-surface"
          >
            {feedback}
          </div>
        )}
        
        {/* Peer Review Queue — no peer-review backend yet */}
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-md">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-label-caps text-on-surface-variant uppercase">Peer Review Queue</h3>
          </div>
          <div className="p-3 bg-surface-container-low rounded border border-dashed border-outline-variant text-center">
            <span className="material-symbols-outlined text-[22px] text-outline-variant">verified_user</span>
            <p className="text-[11px] text-on-surface-variant mt-1">
              Second-opinion requests will appear here once peer review is enabled.
            </p>
          </div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-xl shadow-sm flex-1 flex flex-col overflow-hidden max-h-[700px]">
          <div className="p-md border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-headline-md text-primary mb-1">Report Builder</h3>
            {selected !== null && (
              <p className="text-xs text-on-surface-variant">
                {selected.study?.name ?? 'Study'} — {STATUS_LABEL[selected.status]}
                {reportIsFinal && ' · report final'}
              </p>
            )}
          </div>
          {selected === null ? (
            <div className="flex-1 flex items-center justify-center p-md">
              <p className="text-body-md text-on-surface-variant text-center">
                Select a study to start reporting.
              </p>
            </div>
          ) : !canReport ? (
            <div className="flex-1 flex items-center justify-center p-md">
              <p className="text-body-md text-on-surface-variant text-center">
                The study must be acquired before reporting.
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 p-md overflow-y-auto space-y-md">
                {selected.clinical_indication !== null && (
                  <div>
                    <span className="text-label-caps text-on-surface-variant block mb-1">CLINICAL INDICATION</span>
                    <p className="text-body-sm italic text-on-surface-variant bg-surface-container-lowest p-2 rounded border border-outline-variant">
                      {selected.clinical_indication}
                    </p>
                  </div>
                )}
                <div>
                  <label htmlFor="rad-technique" className="text-label-caps text-on-surface-variant block mb-1">
                    TECHNIQUE
                  </label>
                  <textarea
                    id="rad-technique"
                    value={technique}
                    onChange={(e) => setTechnique(e.target.value)}
                    disabled={reportIsFinal}
                    className="w-full h-16 text-body-sm bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 resize-none"
                    placeholder="e.g. PA and lateral views of the chest…"
                  />
                </div>
                <div>
                  <label htmlFor="rad-findings" className="text-label-caps text-on-surface-variant block mb-1">
                    FINDINGS
                  </label>
                  <textarea
                    id="rad-findings"
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    disabled={reportIsFinal}
                    className="w-full h-32 text-body-sm bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 resize-none"
                    placeholder="Start typing findings…"
                  />
                </div>
                <div>
                  <label htmlFor="rad-impression" className="text-label-caps text-on-surface-variant block mb-1">
                    IMPRESSION
                  </label>
                  <textarea
                    id="rad-impression"
                    value={impression}
                    onChange={(e) => setImpression(e.target.value)}
                    disabled={reportIsFinal}
                    className="w-full h-20 text-body-sm bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-60 resize-none"
                    placeholder="Summary conclusion…"
                  />
                </div>
                <div className="p-3 bg-error-container/10 border border-error/20 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="text-error focus:ring-error rounded"
                      id="rad-critical"
                      type="checkbox"
                      checked={isCritical}
                      disabled={reportIsFinal}
                      onChange={(e) => setIsCritical(e.target.checked)}
                    />
                    <label className="text-xs font-bold text-error" htmlFor="rad-critical">
                      MARK AS CRITICAL FINDING
                    </label>
                  </div>
                  {isCritical && (
                    <textarea
                      value={criticalNotes}
                      onChange={(e) => setCriticalNotes(e.target.value)}
                      disabled={reportIsFinal}
                      aria-label="Critical finding notes"
                      className="w-full h-16 text-body-sm bg-white border border-error/30 rounded-lg px-3 py-2 focus:ring-2 focus:ring-error/20 focus:border-error resize-none"
                      placeholder="Who was notified, when, and how…"
                    />
                  )}
                </div>
              </div>
              <div className="p-md bg-surface border-t border-outline-variant flex gap-2">
                <button
                  type="button"
                  onClick={() => void onSaveDraft()}
                  disabled={saveReport.isPending || reportIsFinal}
                  className="flex-1 py-2 bg-secondary text-white rounded-lg font-bold text-body-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {saveReport.isPending ? 'SAVING…' : 'SAVE DRAFT'}
                </button>
                <button
                  type="button"
                  onClick={() => void onFinalize()}
                  disabled={finalizeReport.isPending || selected.report === null || reportIsFinal}
                  className="flex-1 py-2 bg-primary text-white rounded-lg font-bold text-body-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {reportIsFinal ? 'FINALIZED' : finalizeReport.isPending ? 'SIGNING…' : 'SIGN & FINALIZE'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Floating Voice Dictation Control */}
      <div className="fixed bottom-lg right-lg z-50">
        <button className="w-16 h-16 bg-primary rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all group overflow-hidden relative">
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <span className="material-symbols-outlined text-[32px] relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>mic</span>
          {/* Audio Wave Animation Placeholder */}
          <div className="absolute bottom-2 flex gap-0.5 items-end justify-center w-full opacity-0 group-active:opacity-100 transition-opacity">
            <div className="w-1 h-2 bg-white animate-[bounce_0.8s_infinite]" />
            <div className="w-1 h-4 bg-white animate-[bounce_1.2s_infinite]" />
            <div className="w-1 h-3 bg-white animate-[bounce_1s_infinite]" />
            <div className="w-1 h-5 bg-white animate-[bounce_0.9s_infinite]" />
          </div>
        </button>
      </div>
    </div>
  );
}
