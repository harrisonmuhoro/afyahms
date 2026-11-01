import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBranches } from '@/features/branches/BranchProvider';
import { useBoard, useStartTicket } from '@/features/queue/api';
import type { MtsCategory, QueueTicket } from '@/features/queue/types';
import { cn } from '@/lib/cn';
import { Glyph } from '@/components/icons/Glyph';
import { Clock, Stethoscope, Users } from 'lucide-react';
import { StatTile } from '@/components/ui';

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

  const longestWait = waiting.reduce<number | null>((max, t) => {
    const m = waitMinutes(t);
    return m === null ? max : max === null || m > max ? m : max;
  }, null);
  const boardLoading = isLoading && snapshot === null;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{greeting}</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {today}
            {activeBranch !== null && <> · {activeBranch.name}</>}
          </p>
        </div>

        <div role="group" aria-label="Availability" className="inline-flex self-start rounded-lg border border-line bg-surface p-1 md:self-auto">
          {(['active', 'break'] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={status === s}
              onClick={() => setStatus(s)}
              className={cn(
                'flex min-h-[36px] items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
                status === s
                  ? s === 'active' ? 'bg-primary text-primary-fg' : 'bg-warning-soft text-warning'
                  : 'text-ink-secondary hover:bg-surface-muted',
              )}
            >
              <span aria-hidden className={cn('h-2 w-2 rounded-full', status === s ? (s === 'active' ? 'bg-surface' : 'bg-warning') : 'bg-line-strong')} />
              {s === 'active' ? 'Available' : 'On break'}
            </button>
          ))}
        </div>
      </section>

      {/* ── Today at a glance ───────────────────────────────────────────── */}
      <section aria-label="Today at a glance" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile
          label="Waiting for you"
          value={waiting.length}
          hint={waiting.length === 0 ? 'No patients waiting' : 'In the consultation queue'}
          icon={Users}
          tone={waiting.length > 0 ? 'primary' : 'neutral'}
          loading={boardLoading}
        />
        <StatTile
          label="Now seeing"
          value={inService !== null ? inService.ticket_number : '—'}
          hint={inService !== null ? (inService.patient_name ?? 'Consultation in progress') : 'No active consultation'}
          icon={Stethoscope}
          tone={inService !== null ? 'info' : 'neutral'}
          loading={boardLoading}
        />
        <StatTile
          label="Longest wait"
          value={longestWait === null ? '—' : `${longestWait} min`}
          hint={longestWait !== null && longestWait >= 30 ? 'Above the 30-minute target' : 'Across waiting patients'}
          icon={Clock}
          tone={longestWait !== null && longestWait >= 30 ? 'warning' : 'neutral'}
          loading={boardLoading}
        />
      </section>

      {/* ── Main Content Split ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Left Column: My Queue */}
        <section className="lg:col-span-8 space-y-md">
          <div className="bg-surface border border-outline-variant rounded-xl shadow-card overflow-hidden">
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
                    className="bg-surface border border-outline-variant rounded-lg p-md hover:bg-surface-container/30 transition-all cursor-pointer group"
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
          <div className="bg-surface border border-outline-variant rounded-xl p-md shadow-card">
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
          <div className="bg-surface border border-outline-variant rounded-xl shadow-card overflow-hidden">
            <div className="px-md py-3 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="text-label-caps text-on-surface">Results Ready</h3>
            </div>
            <div className="p-md text-center py-8">
              <Glyph name="biotech" size={28} className="text-outline-variant block mb-2" />
              <p className="text-body-sm text-outline">No pending results</p>
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="bg-surface border border-outline-variant rounded-xl shadow-card overflow-hidden">
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
