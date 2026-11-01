import { useMemo, useState } from 'react';
import { useCorrectionRequests, useReviewCorrection } from '@/features/records/api';
import type { DataCorrectionRequest } from '@/features/records/types';
import { Glyph } from '@/components/icons/Glyph';

function timeAgo(iso: string | null): string {
  if (iso === null) return '—';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function initials(name: string | null): string {
  if (name === null || name.trim() === '') return '—';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

interface ReviewModalProps {
  request: DataCorrectionRequest;
  decision: 'approved' | 'rejected';
  onClose: () => void;
  onConfirm: (reason: string) => void;
  pending: boolean;
}

/** Audit pattern: every sensitive decision requires a written reason. */
function ReviewModal({ request, decision, onClose, onConfirm, pending }: ReviewModalProps): JSX.Element {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="p-md border-b border-outline-variant flex items-center justify-between">
          <h3 className="font-bold text-on-surface">
            {decision === 'approved' ? 'Approve' : 'Reject'} correction — {request.field_name}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface">
            <Glyph name="close" />
          </button>
        </div>
        <div className="p-md space-y-3">
          <p className="text-body-sm text-on-surface-variant">
            Patient: <span className="font-semibold text-on-surface">{request.patient_name ?? '—'}</span> · Requested
            by {request.requested_by ?? '—'}
          </p>
          <div className="p-3 bg-surface-container-low rounded-lg text-body-sm">
            <p>
              <span className="font-semibold">{request.record_type}</span> → {request.field_name}
            </p>
            <p className="mt-1 text-secondary font-data-mono">{request.requested_value}</p>
            {request.reason !== null && (
              <p className="mt-2 italic text-on-surface-variant">“{request.reason}”</p>
            )}
          </div>
          <div>
            <label htmlFor="review-reason" className="block text-body-sm font-semibold text-on-surface mb-1.5">
              Reason (required, logged to audit)
            </label>
            <textarea
              id="review-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border border-outline-variant rounded-lg px-3 py-2 text-body-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="Why is this correction being approved/rejected?"
            />
          </div>
        </div>
        <div className="p-md border-t border-outline-variant flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-outline-variant rounded-lg text-body-sm font-semibold hover:bg-surface-container"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={reason.trim().length < 5 || pending}
            className={`px-4 py-2 rounded-lg text-body-sm font-semibold text-white disabled:opacity-50 ${
              decision === 'approved' ? 'bg-primary' : 'bg-error'
            }`}
          >
            {pending ? 'Saving…' : decision === 'approved' ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Records officer dashboard wired to the data-corrections backend: KPI strip
 * from live counts, pending-corrections queue with old→new styling and
 * reason-gated approve/reject, plus a decision history rail.
 */
export function RecordsDashboard(): JSX.Element {
  const { data: requests, isLoading, error } = useCorrectionRequests();
  const review = useReviewCorrection();
  const [modal, setModal] = useState<{ request: DataCorrectionRequest; decision: 'approved' | 'rejected' } | null>(
    null,
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);
  const decided = useMemo(() => requests.filter((r) => r.status !== 'pending').slice(0, 6), [requests]);
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  const onConfirm = async (reason: string): Promise<void> => {
    if (modal === null) return;
    setFeedback(null);
    try {
      await review.mutateAsync({ id: modal.request.id, status: modal.decision, reason });
      setFeedback(
        `Correction for ${modal.request.patient_name ?? 'patient'} (${modal.request.field_name}) ${modal.decision}.`,
      );
      setModal(null);
    } catch {
      setFeedback('Review failed — the request may already be resolved.');
    }
  };

  return (
    <div className="p-lg space-y-lg min-h-[calc(100vh-64px)]">
      {/* Page Title & Quick Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-headline-lg font-headline-lg text-on-background">Medical Records Dashboard</h2>
          <p className="text-on-surface-variant">
            Data-correction requests and record governance —{' '}
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-surface border border-outline-variant shadow-card rounded-xl flex items-center px-4 py-2 gap-3 min-w-[140px]">
            <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error">
              <Glyph name="priority_high" />
            </div>
            <div>
              <p className="text-[11px] font-label-caps text-on-surface-variant">PENDING</p>
              <p className="font-bold text-headline-md">{isLoading ? '…' : pending.length}</p>
            </div>
          </div>
          <div className="bg-surface border border-outline-variant shadow-card rounded-xl flex items-center px-4 py-2 gap-3 min-w-[140px]">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Glyph name="task_alt" />
            </div>
            <div>
              <p className="text-[11px] font-label-caps text-on-surface-variant">APPROVED</p>
              <p className="font-bold text-headline-md">{isLoading ? '…' : approvedCount}</p>
            </div>
          </div>
          <div className="bg-surface border border-outline-variant shadow-card rounded-xl flex items-center px-4 py-2 gap-3 min-w-[140px]">
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
              <Glyph name="block" />
            </div>
            <div>
              <p className="text-[11px] font-label-caps text-on-surface-variant">REJECTED</p>
              <p className="font-bold text-headline-md">{isLoading ? '…' : rejectedCount}</p>
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

      {/* Bento Layout Content */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Central: Pending Corrections Queue */}
        <div className="col-span-12 lg:col-span-8 space-y-gutter">
          <section className="bg-surface border border-outline-variant shadow-card rounded-xl overflow-hidden">
            <div className="p-md flex items-center justify-between border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <Glyph name="rule" className="text-primary" />
                <h3 className="font-bold text-on-surface">Pending Data Corrections</h3>
              </div>
              <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                {pending.length}
              </span>
            </div>
            {isLoading ? (
              <p className="p-md py-10 text-center text-body-md text-on-surface-variant">Loading requests…</p>
            ) : error !== null ? (
              <p className="p-md py-10 text-center text-body-md text-on-surface-variant">
                Corrections service unavailable.
              </p>
            ) : pending.length === 0 ? (
              <div className="p-md py-10 text-center">
                <Glyph name="task_alt" size={28} className="text-outline-variant" />
                <p className="mt-2 text-body-md text-on-surface-variant">No pending correction requests.</p>
              </div>
            ) : (
              <div className="divide-y divide-surface-container">
                {pending.map((req) => (
                  <div key={req.id} className="p-md hover:bg-surface-container-lowest transition-colors">
                    <div className="flex flex-wrap justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-label-caps text-primary uppercase">
                          {req.record_type} · {req.field_name}
                        </span>
                      </div>
                      <span className="text-[11px] text-on-surface-variant">{timeAgo(req.created_at)}</span>
                    </div>
                    <p className="font-bold text-sm text-on-surface">{req.patient_name ?? 'Unknown patient'}</p>
                    <p className="text-xs text-on-surface-variant">
                      Requested by {req.requested_by ?? '—'}
                      {req.patient_id !== null && (
                        <span className="font-data-mono ml-2">{req.patient_id.slice(0, 8).toUpperCase()}</span>
                      )}
                    </p>
                    {/* new value (the requested change) */}
                    <p className="mt-2 text-body-sm">
                      <span className="text-on-surface-variant">New value: </span>
                      <span className="font-data-mono text-secondary bg-secondary-container/10 px-1.5 py-0.5 rounded">
                        {req.requested_value}
                      </span>
                    </p>
                    {req.reason !== null && (
                      <p className="mt-1.5 text-xs italic text-on-surface-variant border-l-2 border-outline-variant pl-2">
                        “{req.reason}”
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-surface-container flex items-center justify-center text-[10px] font-bold">
                        {initials(req.requested_by)}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setModal({ request: req, decision: 'rejected' })}
                          className="text-xs font-bold text-error hover:bg-error hover:text-white px-3 py-1 rounded-full border border-error/30 transition-all"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => setModal({ request: req, decision: 'approved' })}
                          className="text-xs font-bold text-primary hover:bg-primary hover:text-white px-3 py-1 rounded-full border border-primary/30 transition-all"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Archive metrics — no storage/telemetry backend yet */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="bg-surface border border-outline-variant shadow-card rounded-xl p-md">
              <h3 className="font-bold mb-4 flex items-center gap-2 text-on-surface">
                <Glyph name="database" className="text-secondary" />
                Storage Utilization
              </h3>
              <div className="py-6 text-center">
                <Glyph name="cloud_off" size={24} className="text-outline-variant" />
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  Storage metrics will appear here once archive telemetry is connected.
                </p>
              </div>
            </div>
            <div className="bg-primary-container/5 border border-outline-variant shadow-card rounded-xl p-md">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-on-surface">
                <Glyph name="analytics" className="text-primary" />
                Daily Throughput
              </h3>
              <div className="py-6 text-center">
                <Glyph name="monitoring" size={24} className="text-outline-variant" />
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  Archive volume trends will appear here once reporting is enabled.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Sidebar: Decision history */}
        <div className="col-span-12 lg:col-span-4 space-y-gutter">
          <section className="bg-surface border border-outline-variant shadow-card rounded-xl p-md">
            <h3 className="font-bold text-on-surface mb-3 flex items-center gap-2">
              <Glyph name="history" className="text-on-surface-variant" />
              Recent Decisions
            </h3>
            {decided.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant text-center py-6">No reviewed requests yet.</p>
            ) : (
              <div className="space-y-4">
                {decided.map((req, idx) => (
                  <div key={req.id} className="flex gap-3">
                    <div className="relative">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 ${
                          req.status === 'approved' ? 'bg-primary' : 'bg-error'
                        }`}
                        aria-hidden
                      />
                      {idx < decided.length - 1 && (
                        <div className="absolute top-4 left-1 w-0.5 h-full bg-outline-variant" aria-hidden />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold flex items-center gap-1.5">
                        {req.field_name} — {req.patient_name ?? '—'}
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            req.status === 'approved'
                              ? 'bg-secondary-container/20 text-secondary'
                              : 'bg-error-container/20 text-error'
                          }`}
                        >
                          {req.status}
                        </span>
                      </p>
                      <p className="text-[11px] text-on-surface-variant">
                        {req.reviewed_by ?? '—'}
                        {req.review_reason !== null ? ` — “${req.review_reason}”` : ''}
                      </p>
                      <p className="text-[10px] text-primary mt-1">{timeAgo(req.reviewed_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Footer Utilities */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="bg-surface shadow-card rounded-xl p-lg flex flex-col justify-between min-h-[160px] bg-surface border-l-4 border-l-primary border border-outline-variant">
          <Glyph name="policy" size={26} className="text-primary mb-2" />
          <div>
            <h4 className="font-bold text-on-surface">Privacy &amp; Compliance</h4>
            <p className="text-xs text-on-surface-variant">
              Every correction decision is written to the immutable audit log with your reason.
            </p>
          </div>
        </div>
        <div className="bg-surface shadow-card rounded-xl p-lg flex flex-col justify-between min-h-[160px] bg-surface border-l-4 border-l-secondary border border-outline-variant">
          <Glyph name="verified_user" size={26} className="text-secondary mb-2" />
          <div>
            <h4 className="font-bold text-on-surface">Signature Audit</h4>
            <p className="text-xs text-on-surface-variant">
              Validate physician signatures on digital records for insurance verification.
            </p>
          </div>
        </div>
        <div className="bg-surface shadow-card rounded-xl p-lg flex flex-col justify-between min-h-[160px] bg-surface border-l-4 border-l-tertiary border border-outline-variant">
          <Glyph name="cloud_download" size={26} className="text-tertiary mb-2" />
          <div>
            <h4 className="font-bold text-on-surface">Bulk Data Export</h4>
            <p className="text-xs text-on-surface-variant">
              Securely package encrypted ZIP records for clinical research requests.
            </p>
          </div>
        </div>
      </div>

      {modal !== null && (
        <ReviewModal
          request={modal.request}
          decision={modal.decision}
          onClose={() => setModal(null)}
          onConfirm={(reason) => void onConfirm(reason)}
          pending={review.isPending}
        />
      )}
    </div>
  );
}
