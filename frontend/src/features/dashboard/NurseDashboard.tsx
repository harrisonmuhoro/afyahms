import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBoard } from '@/features/queue/api';
import { usePendingEmarRecords } from '@/features/emr/api';
import { cn } from '@/lib/cn';
import type { MtsCategory, QueueTicket } from '@/features/queue/types';

const MTS_BAR: Record<MtsCategory, string> = {
  red: 'bg-error',
  orange: 'bg-orange-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
};

function waitMinutes(ticket: QueueTicket): number | null {
  const from = ticket.called_at ?? ticket.ticket_date;
  if (!from) return null;
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.round((Date.now() - start) / 60_000));
}

/**
 * Nurse (triage) dashboard wired to the TRI station board: live queue ordered
 * by wait time with "Begin Triage" linking into the real triage assessment
 * page (TriagePage owns the vitals form + submission mutation). The
 * medication-administration strip renders an empty state until the eMAR
 * backend exists.
 */
export function NurseDashboard(): JSX.Element {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { snapshot, isLoading } = useBoard('TRI');
  const { data: pendingMeds, isLoading: loadingMeds } = usePendingEmarRecords();

  const waiting = snapshot?.waiting ?? [];
  const inService = snapshot?.in_service ?? null;
  const queue: QueueTicket[] = inService !== null ? [inService, ...waiting] : [...waiting];

  const beginTriage = (ticket: QueueTicket): void => {
    navigate(`/queue/triage/${ticket.visit_id}?ticket=${ticket.id}`);
  };

  return (
    <div className="p-lg space-y-lg">
      {/* Header Section */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-headline-lg text-headline-lg text-on-background">Nurse Dashboard (Triage)</h2>
          <div className="flex items-center gap-3 text-body-sm text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              {snapshot?.station.name ?? 'Triage'}
            </span>
            {user !== null && (
              <>
                <span className="w-1 h-1 bg-outline-variant rounded-full" aria-hidden />
                <span className="text-body-sm">{user.name}</span>
              </>
            )}
          </div>
        </div>
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-full shadow-sm',
            waiting.length > 0
              ? 'bg-primary-container text-on-primary-container animate-pulse'
              : 'bg-surface-container text-on-surface-variant',
          )}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            group
          </span>
          <span className="font-bold text-body-md">
            {isLoading && snapshot === null ? 'Loading…' : `${waiting.length} Patients Waiting`}
          </span>
        </div>
      </section>

      {/* Live Queue */}
      <section className="max-w-3xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
            Live Queue
          </h3>
          <button
            type="button"
            onClick={() => navigate('/queue/board/TRI')}
            className="text-primary text-body-sm font-semibold flex items-center gap-1 hover:underline"
          >
            Full board <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          </button>
        </div>

        {isLoading && snapshot === null ? (
          <p className="py-10 text-center text-body-md text-on-surface-variant">Loading queue…</p>
        ) : queue.length === 0 ? (
          <div className="bg-white border border-outline-variant rounded-xl py-10 text-center">
            <span className="material-symbols-outlined text-[32px] text-outline-variant">event_seat</span>
            <p className="mt-2 text-body-md text-on-surface-variant">No patients waiting for triage.</p>
          </div>
        ) : (
          <div className="space-y-md">
            {queue.map((ticket) => {
              const mins = waitMinutes(ticket);
              const longWait = mins !== null && mins >= 30;
              const serving = ticket.state === 'in_service';
              return (
                <div
                  key={ticket.id}
                  className={cn(
                    'relative overflow-hidden bg-white border rounded-xl p-md flex items-center justify-between gap-4',
                    serving ? 'border-primary/40 ring-2 ring-primary/10' : 'border-outline-variant',
                  )}
                >
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 w-1.5',
                      ticket.mts_category !== null ? MTS_BAR[ticket.mts_category] : 'bg-outline-variant',
                    )}
                    aria-hidden
                  />
                  <div className="pl-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-data-mono font-bold text-on-surface">{ticket.ticket_number}</span>
                      <p className="font-semibold text-on-surface truncate">{ticket.patient_name ?? '—'}</p>
                      {serving && (
                        <span className="px-2 py-0.5 rounded bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                          In Triage
                        </span>
                      )}
                      {ticket.priority === 'emergency' && (
                        <span className="px-2 py-0.5 rounded bg-error text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">e911_emergency</span>
                          Emergency
                        </span>
                      )}
                    </div>
                    <p className="text-body-sm text-on-surface-variant font-data-mono mt-0.5">
                      {ticket.patient_number ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span
                      className={cn(
                        'flex items-center gap-1 text-body-sm font-data-mono font-semibold',
                        longWait ? 'text-error' : 'text-on-surface-variant',
                      )}
                    >
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      {mins !== null ? `${mins}m` : '—'}
                      {longWait && <span className="sr-only">(long wait)</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => beginTriage(ticket)}
                      className="bg-primary text-white px-4 py-2 rounded-lg font-semibold text-body-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">stethoscope</span>
                      {serving ? 'Continue Triage' : 'Begin Triage'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Medication Administration */}
      <section className="max-w-3xl">
        <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mb-3">
          Medication Administration
        </h3>
        {loadingMeds ? (
          <p className="py-8 text-center text-body-md text-on-surface-variant">Loading pending medications…</p>
        ) : pendingMeds.length === 0 ? (
          <div className="bg-surface-container-low border border-dashed border-outline-variant rounded-xl py-8 text-center">
            <span className="material-symbols-outlined text-[28px] text-outline-variant">medication</span>
            <p className="mt-2 text-body-md text-on-surface-variant">
              No pending medication administrations for today.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingMeds.map((med) => (
              <div key={med.id} className="bg-white border border-outline-variant rounded-xl p-md flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-on-surface truncate">{med.medication?.generic_name}</p>
                    <span className="px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary-container text-[10px] font-bold uppercase tracking-wider">
                      {med.dose}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-surface-variant text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
                      {med.route}
                    </span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mt-0.5">
                    For patient: <strong className="text-on-surface">{(med as any).patient?.full_name ?? '—'}</strong> 
                    {' • '} Scheduled at: <strong className="text-on-surface">{new Date(med.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/emr/encounter/${med.visit_id}`)}
                  className="shrink-0 bg-primary/10 text-primary px-4 py-2 rounded-lg font-semibold text-body-sm hover:bg-primary/20 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Administer
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
