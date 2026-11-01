import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBranches } from '@/features/branches/BranchProvider';
import { useBoard, useStartTicket } from '@/features/queue/api';
import type { MtsCategory, QueueTicket } from '@/features/queue/types';
import { cn } from '@/lib/cn';
import { Glyph } from '@/components/icons/Glyph';

const MTS_BAR: Record<MtsCategory, string> = {
  red:    'bg-red-600',
  orange: 'bg-orange-500',
  yellow: 'bg-amber-500',
  green:  'bg-green-500',
  blue:   'bg-blue-500',
};

function waitMinutes(ticket: QueueTicket): number | null {
  const from = ticket.called_at ?? ticket.ticket_date;
  if (!from) return null;
  const start = new Date(from).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.round((Date.now() - start) / 60_000));
}

type DoctorStatus = 'active' | 'break';

export function DoctorDashboard(): JSX.Element {
  const { user } = useAuth();
  const { activeBranch } = useBranches();
  const navigate = useNavigate();
  const { snapshot, isLoading } = useBoard('DOC');
  const startTicket = useStartTicket();
  const [tab, setTab] = useState<'waiting' | 'in_service' | 'completed'>('waiting');
  const [status, setStatus] = useState<DoctorStatus>('active');

  const waiting = snapshot?.waiting ?? [];
  const inService = snapshot?.in_service ?? null;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const prefix = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return user !== null ? `${prefix}, ${user.name}` : prefix;
  }, [user]);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  });

  const onStartEncounter = async (ticket: QueueTicket): Promise<void> => {
    try {
      if (ticket.state !== 'in_service') await startTicket.mutateAsync(ticket.id);
      navigate(`/emr/encounter/${ticket.visit_id}`);
    } catch { /* stay */ }
  };

  const tabTickets = tab === 'waiting' ? waiting : tab === 'in_service' && inService ? [inService] : [];

  return (
    <div className="p-lg space-y-lg max-w-[1600px] mx-auto w-full">
      {/* ── Greeting Header ──────────────────────────────────────────────── */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">{greeting}</h2>
          <div className="flex items-center gap-md mt-1 flex-wrap">
            <div className="flex items-center gap-1.5 text-tertiary">
              <Glyph name="calendar_today" size={18} />
              <span className="text-body-md">{today}</span>
            </div>
            {activeBranch !== null && (
              <div className="flex items-center gap-1.5 text-primary bg-primary-container/10 px-2 py-0.5 rounded">
                <Glyph name="door_open" size={18} />
                <span className="text-body-md font-medium">{activeBranch.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Availability Toggle */}
        <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-outline-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
          <button
            onClick={() => setStatus('active')}
            className={cn(
              'px-4 py-1.5 rounded-md text-body-sm font-semibold flex items-center gap-2 transition-all',
              status === 'active'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container',
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', status === 'active' ? 'bg-white animate-pulse' : 'bg-outline-variant')} />
            Active
          </button>
          <button
            onClick={() => setStatus('break')}
            className={cn(
              'px-4 py-1.5 rounded-md text-body-sm font-semibold flex items-center gap-2 transition-all',
              status === 'break'
                ? 'bg-tertiary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container',
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', status === 'break' ? 'bg-white animate-pulse' : 'bg-outline-variant')} />
            On Break
          </button>
        </div>
      </section>

      {/* ── KPI Row ────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        {/* KPI 1: Queue */}
        <div className="bg-white border border-outline-variant rounded-xl p-md shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:border-primary/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-label-caps text-tertiary">Patients in My Queue</span>
            <Glyph name="groups" className="text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[32px] font-bold text-on-surface">
              {isLoading && snapshot === null ? '…' : waiting.length}
            </span>
            {waiting.length > 0 && (
              <span className="text-body-sm text-primary font-medium">in queue</span>
            )}
          </div>
        </div>

        {/* KPI 2: Seen Today */}
        <div className="bg-white border border-outline-variant rounded-xl p-md shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:border-primary/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-label-caps text-tertiary">Seen Today</span>
            <Glyph name="check_circle" className="text-secondary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[32px] font-bold text-on-surface">—</span>
            <span className="text-body-sm text-tertiary">seen today</span>
          </div>
        </div>

        {/* KPI 3: Pending Lab Results */}
        <div className="bg-white border border-outline-variant rounded-xl p-md shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:border-primary/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-label-caps text-tertiary">Pending Lab Results</span>
            <Glyph name="warning" className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[32px] font-bold text-on-surface">—</span>
            <span className="text-body-sm text-tertiary font-medium">no pending</span>
          </div>
        </div>

        {/* KPI 4: Prescriptions Pending */}
        <div className="bg-white border border-outline-variant rounded-xl p-md shadow-[0px_1px_3px_rgba(0,0,0,0.05)] hover:border-primary/30 transition-colors">
          <div className="flex justify-between items-start">
            <span className="text-label-caps text-tertiary">Prescriptions Pending</span>
            <Glyph name="pill" className="text-tertiary" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[32px] font-bold text-on-surface">—</span>
            <span className="text-body-sm text-tertiary">none pending</span>
          </div>
        </div>
      </section>

      {/* ── Main Content Split ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Left Column: My Queue */}
        <section className="lg:col-span-8 space-y-md">
          <div className="bg-white border border-outline-variant rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Tab header */}
            <div className="px-md pt-md flex items-center justify-between border-b border-outline-variant">
              <div className="flex gap-lg">
                {(['waiting', 'in_service', 'completed'] as const).map((t) => {
                  const labels: Record<typeof t, string> = { waiting: 'Waiting', in_service: 'In Progress', completed: 'Completed' };
                  const counts: Record<typeof t, number> = { waiting: waiting.length, in_service: inService ? 1 : 0, completed: 0 };
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={cn(
                        'pb-3 px-1 border-b-2 font-medium text-body-md flex items-center gap-2 transition-colors',
                        tab === t
                          ? 'border-primary text-primary font-semibold'
                          : 'border-transparent text-tertiary hover:text-on-surface',
                      )}
                    >
                      {labels[t]}
                      <span className={cn('px-2 py-0.5 rounded-full text-xs', tab === t ? 'bg-primary/10' : 'bg-surface-container')}>
                        {counts[t]}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => navigate('/queue/board/DOC')}
                className="mb-3 text-primary text-body-sm font-semibold flex items-center gap-1 hover:underline"
              >
                <Glyph name="history" size={14} />
                Queue Logs
              </button>
            </div>

            <div className="p-md space-y-md">
              {/* Now Serving hero card */}
              {inService !== null && (tab === 'waiting' || tab === 'in_service') && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-md relative overflow-hidden ring-2 ring-primary/10">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-error" />
                  <div className="flex justify-between items-start mb-sm pl-2">
                    <div>
                      <span className="inline-block bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider mb-2">
                        Now Serving
                      </span>
                      <div className="flex items-center gap-3">
                        <h3 className="text-headline-md font-bold text-on-surface">{inService.patient_name ?? '—'}</h3>
                        <code className="text-data-mono font-data-mono bg-surface-container px-2 py-0.5 rounded text-xs">
                          {inService.ticket_number}
                        </code>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-label-caps text-tertiary mb-1">Wait Time</p>
                      <span className="text-amber-600 font-data-mono font-bold text-body-md flex items-center gap-1">
                        <Glyph name="schedule" size={14} />
                        {waitMinutes(inService) ?? '—'}m
                      </span>
                    </div>
                  </div>

                  <div className="pl-2 flex gap-md pt-2 border-t border-primary/10">
                    <button
                      onClick={() => onStartEncounter(inService)}
                      disabled={startTicket.isPending}
                      className="bg-primary text-on-primary px-6 py-2 rounded-lg font-semibold text-body-md hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Glyph name="play_arrow" size={14} />
                      Start Encounter
                    </button>
                    <button className="border border-outline-variant text-on-surface px-4 py-2 rounded-lg font-semibold text-body-md hover:bg-surface-container transition-all">
                      View Vitals History
                    </button>
                  </div>
                </div>
              )}

              {/* Loading */}
              {isLoading && snapshot === null && (
                <p className="py-8 text-center text-body-sm text-outline">Loading queue…</p>
              )}

              {/* Empty state */}
              {snapshot !== null && tabTickets.length === 0 && (tab !== 'waiting' || inService === null) && (
                <div className="py-10 text-center">
                  <Glyph name="inbox" size={28} className="text-outline-variant" />
                  <p className="mt-2 text-body-sm font-medium text-outline">Queue is empty</p>
                </div>
              )}

              {/* Queue cards */}
              {(tab === 'waiting' ? waiting : tabTickets).map((ticket) => {
                const mins = waitMinutes(ticket);
                return (
                  <div
                    key={ticket.id}
                    className="bg-white border border-outline-variant rounded-lg p-md hover:bg-surface-container/30 transition-all cursor-pointer group"
                  >
                    <div className="flex gap-md relative">
                      <div className={cn('w-1 rounded-full shrink-0', ticket.mts_category ? MTS_BAR[ticket.mts_category] : 'bg-outline-variant')} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-body-md font-bold group-hover:text-primary transition-colors">
                                {ticket.patient_name ?? '—'}
                              </h3>
                              <code className="text-data-mono text-[11px] text-outline">{ticket.ticket_number}</code>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-[11px] text-tertiary font-data-mono">Wait: {mins ?? '—'}m</span>
                          </div>
                        </div>
                        <div className="mt-sm flex justify-end">
                          <button className="text-primary text-body-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Prepare Note
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: Side Panels */}
        <section className="lg:col-span-4 space-y-lg">
          {/* Quick Actions */}
          <div className="bg-white border border-outline-variant rounded-xl p-md shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <h3 className="text-label-caps text-tertiary mb-md flex items-center gap-2">
              <Glyph name="bolt" size={16} /> Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-sm">
              {[
                { icon: 'pill', label: 'New Rx', to: '/emr' },
                { icon: 'biotech', label: 'Order Lab', to: '/laboratory' },
                { icon: 'radiology', label: 'Imaging', to: '/radiology' },
                { icon: 'assignment_ind', label: 'Referral', to: '/emr' },
              ].map(({ icon, label, to }) => (
                <button
                  key={label}
                  onClick={() => navigate(to)}
                  className="flex flex-col items-center justify-center gap-2 p-3 border border-outline-variant rounded-lg hover:bg-primary-container/10 hover:border-primary/30 transition-all group"
                >
                  <Glyph name={icon} className="text-primary transition-transform" />
                  <span className="text-[11px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Results Ready */}
          <div className="bg-white border border-outline-variant rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-md py-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="text-label-caps text-on-surface">Results Ready</h3>
            </div>
            <div className="p-md text-center py-8">
              <Glyph name="biotech" size={28} className="text-outline-variant block mb-2" />
              <p className="text-body-sm text-outline">No pending results</p>
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="bg-white border border-outline-variant rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-md py-3 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h3 className="text-label-caps text-on-surface">Today's Schedule</h3>
              <button
                onClick={() => navigate('/appointments')}
                className="text-[11px] text-primary font-bold hover:underline"
              >
                Full Calendar
              </button>
            </div>
            <div className="p-md text-center py-8">
              <Glyph name="calendar_month" size={28} className="text-outline-variant block mb-2" />
              <p className="text-body-sm text-outline">No appointments today</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
