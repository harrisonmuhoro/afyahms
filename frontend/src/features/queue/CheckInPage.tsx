import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';
import type { IconName } from '@/components/icons/Icon';
import { usePatients } from '@/features/patients/api';
import { useBoard, useOpenVisit, useStations } from './api';
import type { QueueTicket, TicketPriority, TicketState } from './types';

const STATE_STYLE: Record<TicketState, { icon: IconName; className: string }> = {
  issued: {
    icon: 'time',
    className: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  },
  waiting: {
    icon: 'time',
    className: 'bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200',
  },
  called: {
    icon: 'bell',
    className: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  },
  in_service: {
    icon: 'triage',
    className: 'bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200',
  },
  held: {
    icon: 'alertCircle',
    className: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  },
  completed: {
    icon: 'check',
    className: 'bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-200',
  },
  no_show: {
    icon: 'close',
    className: 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200',
  },
  transferred: {
    icon: 'arrowRight',
    className: 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200',
  },
  cancelled: {
    icon: 'close',
    className: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  },
};

const PRIORITY_STYLE: Record<TicketPriority, string> = {
  normal: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
  priority: 'bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200',
  emergency: 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200',
};

function formatTicketTime(ticket: QueueTicket): string {
  const raw = ticket.served_at ?? ticket.called_at;
  if (raw === null) {
    return '—';
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function CheckInPage(): JSX.Element {
  const { t } = useTranslation(['queue', 'patients', 'common', 'errors']);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);

  const [patientId, setPatientId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [visitType, setVisitType] = useState<'walk_in' | 'appointment' | 'referral' | 'follow_up' | 'emergency'>(
    'walk_in',
  );
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ visitNumber: string; patientName: string } | null>(null);

  const patients = usePatients({ page: 1, perPage: 25, search: search !== '' ? search : undefined });
  const openVisit = useOpenVisit();
  const recBoard = useBoard('REC');
  const stations = useStations();

  const selectedPatient = patients.data.find((p) => p.internal_id === patientId) ?? null;
  const waitingCount = recBoard.snapshot?.waiting.length ?? 0;
  const nowServing = recBoard.snapshot?.in_service ?? null;
  const openStations = stations.data.filter((s) => s.is_active && s.status !== 'closed').length;
  const queueRows: QueueTicket[] = [
    ...(nowServing !== null ? [nowServing] : []),
    ...(recBoard.snapshot?.waiting ?? []),
  ];

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (patientId === null) {
      setError(t('queue:check_in.errors.no_patient'));
      return;
    }
    try {
      const res = await openVisit.mutateAsync({ patient_id: patientId, visit_type: visitType });

      if (res.data.visit_number) {
        setSuccessData({
          visitNumber: res.data.visit_number,
          patientName: res.data.patient_name || 'Patient',
        });
        // We will not navigate immediately, letting the user see the visit number.
      } else {
        navigate('/queue/board/TRI');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message !== '' ? err.message : t('errors:generic');
      setError(message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{t('queue:check_in.title')}</h1>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
            {t('queue:check_in.subtitle')}
          </p>
        </div>
        <Link to="/queue" className="btn-ghost text-xs">
          <Icon name="arrowLeft" size={14} />
          {t('common:back')}
        </Link>
      </div>

      {/* Prominent patient search */}
      <div className="space-y-2">
        <div className="relative max-w-2xl">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500"
          />
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder={t('patients:placeholders.search')}
            aria-label={t('queue:check_in.search_patient')}
            className="input h-12 rounded-2xl pl-11 pr-4 shadow-sm"
          />
        </div>
        {selectedPatient !== null && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
              {t('queue:check_in.selected')}
            </span>
            <span className="chip bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200">
              <Icon name="user" size={12} />
              {selectedPatient.full_name}
              <span className="font-mono text-[10px]">{selectedPatient.patient_number}</span>
            </span>
            <button
              type="button"
              onClick={() => setPatientId(null)}
              className="text-[11px] font-medium text-stone-500 underline-offset-2 hover:text-stone-700 hover:underline dark:text-stone-400 dark:hover:text-stone-200"
            >
              {t('queue:check_in.clear')}
            </button>
          </div>
        )}
      </div>

      {/* Hero action row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          to="/patients/new"
          className="group flex items-center gap-4 rounded-2xl bg-brand-600 p-5 text-left text-white shadow-lg shadow-brand-600/20 transition-all hover:bg-brand-700 active:scale-[0.99]"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Icon name="plus" size={28} className="text-white" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold">
              {t('queue:check_in.hero.register_title')}
            </span>
            <span className="mt-0.5 block text-xs text-brand-100">
              {t('queue:check_in.hero.register_desc')}
            </span>
          </span>
          <Icon
            name="chevronRight"
            size={18}
            className="ml-auto shrink-0 text-brand-100 transition-transform group-hover:translate-x-1"
          />
        </Link>

        <button
          type="button"
          onClick={() => searchRef.current?.focus()}
          className="group flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-card transition-all hover:bg-stone-50 active:scale-[0.99] dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/40">
            <Icon name="queue" size={28} className="text-brand-600 dark:text-brand-400" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-stone-900 dark:text-stone-100">
              {t('queue:check_in.hero.checkin_title')}
            </span>
            <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
              {t('queue:check_in.hero.checkin_desc')}
            </span>
          </span>
          <Icon
            name="chevronRight"
            size={18}
            className="ml-auto shrink-0 text-stone-400 transition-transform group-hover:translate-x-1"
          />
        </button>
      </div>

      {/* KPI row (derived from live queue + station data) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {t('queue:check_in.kpi.waiting')}
          </p>
          <div className="flex items-end justify-between gap-2">
            <span className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
              {waitingCount}
            </span>
            <Icon name="users" size={20} className="mb-1 text-brand-600 dark:text-brand-400" />
          </div>
        </div>
        <div className="stat-card">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {t('queue:check_in.kpi.now_serving')}
          </p>
          <div className="flex items-end justify-between gap-2">
            <span className="font-mono text-2xl font-semibold text-brand-700 dark:text-brand-300">
              {nowServing?.ticket_number ?? '—'}
            </span>
            <Icon name="bell" size={20} className="mb-1 text-brand-600 dark:text-brand-400" />
          </div>
        </div>
        <div className="stat-card">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {t('queue:check_in.kpi.stations_open')}
          </p>
          <div className="flex items-end justify-between gap-2">
            <span className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
              {openStations}
              <span className="text-sm font-normal text-stone-400 dark:text-stone-500">
                /{stations.data.length}
              </span>
            </span>
            <Icon name="monitor" size={20} className="mb-1 text-brand-600 dark:text-brand-400" />
          </div>
        </div>
      </div>

      {error !== null && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <Icon name="alertCircle" size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {successData !== null && (
        <div
          role="status"
          className="card space-y-3 border-green-200 bg-green-50 p-5 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100"
        >
          <div className="flex items-start gap-2">
            <Icon name="check" size={20} className="mt-0.5 shrink-0 text-clinical-triage_green" />
            <div>
              <p className="text-lg font-semibold text-green-800 dark:text-green-200">
                {t('queue:check_in.success_title')}
              </p>
              <p>{t('queue:check_in.success_body', { name: successData.patientName })}</p>
            </div>
          </div>
          <div className="rounded-xl bg-green-100 p-3 text-center dark:bg-green-900/60">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-300">
              {t('queue:check_in.visit_number')}
            </p>
            <p className="font-mono text-2xl font-black tracking-widest text-green-900 dark:text-green-100">
              {successData.visitNumber}
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <button onClick={() => navigate('/queue/board/TRI')} className="btn-primary text-sm">
              {t('queue:check_in.go_triage')}
              <Icon name="arrowRight" size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main split: check-in form + front-desk queue table */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {/* Check-in form */}
        {successData === null && (
          <form onSubmit={onSubmit} className="card space-y-4 p-5 xl:col-span-2">
            <div className="flex items-center gap-2 border-b border-stone-200 pb-3 dark:border-stone-800">
              <Icon name="queue" size={18} className="text-brand-600 dark:text-brand-400" />
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {t('queue:check_in.title')}
              </h2>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-stone-600 dark:text-stone-300">
                {t('queue:check_in.search_patient')}
              </p>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-stone-200 dark:border-stone-800">
                {patients.isLoading && (
                  <p className="px-3 py-4 text-center text-xs text-stone-500 dark:text-stone-400">
                    {t('common:loading')}
                  </p>
                )}
                {!patients.isLoading && patients.data.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-stone-500 dark:text-stone-400">
                    {t('patients:empty')}
                  </p>
                )}
                <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                  {patients.data.map((p) => (
                    <li key={p.internal_id}>
                      <button
                        type="button"
                        onClick={() => setPatientId(p.internal_id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors',
                          patientId === p.internal_id
                            ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/30 dark:text-brand-100'
                            : 'hover:bg-stone-50 dark:hover:bg-stone-900/40',
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          {patientId === p.internal_id && (
                            <Icon name="check" size={14} className="shrink-0 text-brand-600 dark:text-brand-400" />
                          )}
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate font-medium">{p.full_name}</span>
                            <span className="font-mono text-[10px] text-stone-500 dark:text-stone-400">
                              {p.patient_number}
                            </span>
                          </span>
                        </span>
                        <span className="shrink-0 text-[10px] text-stone-500 dark:text-stone-400">
                          {p.gender ?? '—'} · {p.age ?? '—'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <label className="flex flex-col text-xs font-medium text-stone-600 dark:text-stone-300">
              {t('queue:check_in.visit_type')}
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.currentTarget.value as typeof visitType)}
                className="input mt-1"
              >
                <option value="walk_in">{t('queue:check_in.visit_type_walk_in')}</option>
                <option value="appointment">{t('queue:check_in.visit_type_appointment')}</option>
                <option value="referral">{t('queue:check_in.visit_type_referral')}</option>
                <option value="follow_up">{t('queue:check_in.visit_type_follow_up')}</option>
                <option value="emergency">{t('queue:check_in.visit_type_emergency')}</option>
              </select>
            </label>

            <div className="flex justify-end gap-2 border-t border-stone-200 pt-3 dark:border-stone-800">
              <Link to="/queue" className="btn-ghost text-sm">
                {t('common:cancel')}
              </Link>
              <button
                type="submit"
                disabled={openVisit.isPending || patientId === null}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {openVisit.isPending ? t('queue:check_in.submitting') : t('queue:check_in.submit')}
              </button>
            </div>
          </form>
        )}

        {/* Front-desk queue table */}
        <section
          aria-labelledby="front-desk-queue-heading"
          className={cn('card flex flex-col overflow-hidden', successData === null ? 'xl:col-span-3' : 'xl:col-span-5')}
        >
          <div className="flex items-center justify-between gap-2 border-b border-stone-200 px-4 py-3 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <Icon name="users" size={18} className="text-brand-600 dark:text-brand-400" />
              <h2 id="front-desk-queue-heading" className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {t('queue:check_in.queue.title')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => recBoard.refetch()}
              className="btn-ghost text-xs text-brand-700 dark:text-brand-300"
            >
              {t('queue:check_in.queue.refresh')}
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            {recBoard.isLoading && queueRows.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-stone-500 dark:text-stone-400">
                {t('common:loading')}
              </p>
            )}
            {!recBoard.isLoading && queueRows.length === 0 && (
              <p className="px-4 py-8 text-center text-xs text-stone-500 dark:text-stone-400">
                {t('queue:check_in.queue.empty')}
              </p>
            )}
            {queueRows.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800">
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                      {t('queue:check_in.queue.col_ticket')}
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                      {t('queue:check_in.queue.col_patient')}
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                      {t('queue:check_in.queue.col_priority')}
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                      {t('queue:check_in.queue.col_station')}
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                      {t('queue:check_in.queue.col_time')}
                    </th>
                    <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                      {t('queue:check_in.queue.col_status')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                  {queueRows.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="h-12 transition-colors hover:bg-stone-50 dark:hover:bg-stone-900/40"
                    >
                      <td className="px-4 font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">
                        {ticket.ticket_number}
                      </td>
                      <td className="px-4 text-sm text-stone-900 dark:text-stone-100">
                        <span className="block truncate">{ticket.patient_name ?? '—'}</span>
                        <span className="block font-mono text-[10px] text-stone-500 dark:text-stone-400">
                          {ticket.patient_number ?? '—'}
                        </span>
                      </td>
                      <td className="px-4">
                        <span
                          className={cn(
                            'badge text-[11px] font-semibold',
                            PRIORITY_STYLE[ticket.priority],
                          )}
                        >
                          {t(`queue:check_in.priority.${ticket.priority}`)}
                        </span>
                      </td>
                      <td className="px-4 text-xs text-stone-600 dark:text-stone-300">
                        {ticket.station_name}
                      </td>
                      <td className="px-4 font-mono text-xs text-stone-500 dark:text-stone-400">
                        {formatTicketTime(ticket)}
                      </td>
                      <td className="px-4 text-right">
                        <span
                          className={cn(
                            'badge gap-1 text-[11px] font-semibold',
                            STATE_STYLE[ticket.state].className,
                          )}
                        >
                          <Icon name={STATE_STYLE[ticket.state].icon} size={12} />
                          {t(`queue:check_in.state.${ticket.state}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border-t border-stone-200 px-4 py-2 dark:border-stone-800">
            <Link
              to="/queue/board/REC"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              {t('queue:check_in.queue.open_board')}
              <Icon name="chevronRight" size={12} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
