import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  useBoard,
  useCallNext,
  useCompleteTicket,
  useHoldTicket,
  useNoShowTicket,
  useStartTicket,
} from './api';
import type { MtsCategory, QueueTicket, StationCode } from './types';


const VALID_CODES: StationCode[] = ['REC', 'TRI', 'DOC', 'LAB', 'RAD', 'PHA', 'BIL'];

const MTS_COLOR: Record<MtsCategory, string> = {
  red: 'bg-red-100 text-red-900 ring-red-300 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-800',
  orange:
    'bg-orange-100 text-orange-900 ring-orange-300 dark:bg-orange-950/50 dark:text-orange-200 dark:ring-orange-800',
  yellow:
    'bg-yellow-100 text-yellow-900 ring-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-900 dark:ring-yellow-700',
  green:
    'bg-green-100 text-green-900 ring-green-300 dark:bg-green-950/50 dark:text-green-200 dark:ring-green-800',
  blue: 'bg-blue-100 text-blue-900 ring-blue-300 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-800',
};

const MTS_LABEL: Record<MtsCategory, string> = {
  red: 'triage:red',
  orange: 'triage:orange',
  yellow: 'triage:yellow',
  green: 'triage:green',
  blue: 'triage:blue',
};

const NEXT_STATION: Record<StationCode, StationCode | null> = {
  REC: 'TRI',
  TRI: 'DOC',
  DOC: 'LAB',
  LAB: 'RAD',
  RAD: 'PHA',
  PHA: 'BIL',
  BIL: null,
};

function isStationCode(value: string | undefined): value is StationCode {
  return value !== undefined && (VALID_CODES as string[]).includes(value);
}

export function BoardPage(): JSX.Element {
  const { t } = useTranslation(['queue', 'triage', 'common']);
  const { code: rawCode } = useParams<{ code: string }>();
  const code = isStationCode(rawCode) ? rawCode : null;
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const { snapshot, isLoading } = useBoard(code ?? 'REC');
  const startTicket = useStartTicket();
  const completeTicket = useCompleteTicket();
  const holdTicket = useHoldTicket();
  const noShowTicket = useNoShowTicket();
  const callNext = useCallNext();

  const [lastAction, setLastAction] = useState<string | null>(null);

  if (code === null) {
    return (
      <div className="card p-6 text-sm text-clinical-critical">
        {t('queue:board.invalid_code')}
      </div>
    );
  }

  const canCall = hasPermission('queue.call-next');
  const canManage = hasPermission('queue.manage');
  const canAssignCategory = hasPermission('triage.assign-category');
  const canConsult = hasPermission('emr.read');

  const onCallNext = async (): Promise<void> => {
    if (snapshot === null) return;
    setLastAction(null);
    try {
      await callNext.mutateAsync(snapshot.station.id);
      setLastAction(t('queue:board.called_next'));
    } catch {
      setLastAction(t('queue:board.no_waiting'));
    }
  };

  const onStart = async (ticket: QueueTicket): Promise<void> => {
    setLastAction(null);
    try {
      await startTicket.mutateAsync(ticket.id);
      setLastAction(t('queue:board.started', { ticket: ticket.ticket_number }));
    } catch {
      setLastAction(t('queue:board.start_failed'));
    }
  };

  const onComplete = async (ticket: QueueTicket): Promise<void> => {
    setLastAction(null);
    const next = NEXT_STATION[code];
    try {
      await completeTicket.mutateAsync({ ticketId: ticket.id, next_station: next ?? undefined });
      setLastAction(
        next !== null
          ? t('queue:board.completed_next', { ticket: ticket.ticket_number, next })
          : t('queue:board.completed', { ticket: ticket.ticket_number }),
      );
    } catch {
      setLastAction(t('queue:board.complete_failed'));
    }
  };

  const onHold = async (ticket: QueueTicket): Promise<void> => {
    setLastAction(null);
    try {
      await holdTicket.mutateAsync(ticket.id);
      setLastAction(t('queue:board.held', { ticket: ticket.ticket_number }));
    } catch {
      // ignore for now
    }
  };

  const onNoShow = async (ticket: QueueTicket): Promise<void> => {
    setLastAction(null);
    try {
      await noShowTicket.mutateAsync(ticket.id);
      setLastAction(t('queue:board.no_show_label', { ticket: ticket.ticket_number }));
    } catch {
      // ignore for now
    }
  };

  const goToTriage = (ticket: QueueTicket): void => {
    navigate(`/queue/triage/${ticket.visit_id}?ticket=${ticket.id}`);
  };

  const goToEncounter = (ticket: QueueTicket): void => {
    navigate(`/emr/encounter/${ticket.visit_id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            {snapshot?.station.name ?? code} <span className="font-mono text-xs text-stone-500">({code})</span>
          </h1>
          <p className="text-xs text-stone-500">
            {t('queue:board.waiting_count', { count: snapshot?.waiting.length ?? 0 })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/queue/check-in" className="btn-secondary text-xs">
            {t('queue:check_in.title')}
          </Link>
          {canCall && (
            <button
              type="button"
              onClick={onCallNext}
              disabled={callNext.isPending || snapshot === null}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {t('queue:board.call_next')}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {VALID_CODES.map((c) => (
          <Link
            key={c}
            to={`/queue/board/${c}`}
            className={cn(
              'rounded-md px-3 py-1 ring-1 ring-stone-300 dark:ring-stone-700',
              c === code
                ? 'bg-brand-100 text-brand-900 dark:bg-brand-950/40 dark:text-brand-200'
                : 'bg-white text-stone-700 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800',
            )}
          >
            {c}
          </Link>
        ))}
      </div>

      {lastAction !== null && (
        <div
          role="status"
          className="rounded-md bg-stone-100 px-3 py-2 text-xs text-stone-700 dark:bg-stone-900 dark:text-stone-300"
        >
          {lastAction}
        </div>
      )}

      <section
        aria-labelledby="now-serving-heading"
        className="card p-4"
      >
        <h2 id="now-serving-heading" className="mb-2 text-xs font-semibold uppercase text-stone-500">
          {t('queue:board.now_serving')}
        </h2>
        {snapshot === null || snapshot.in_service === null ? (
          <p className="text-sm text-stone-500">{t('queue:board.empty_serving')}</p>
        ) : (
          <TicketRow
            ticket={snapshot.in_service}
            inService
            canStart={false}
            canComplete={canManage}
            canHold={canManage}
            canNoShow={canManage}
            canTriage={false}
            canConsult={canConsult && snapshot.in_service.station_code === 'DOC'}
            onStart={onStart}
            onComplete={onComplete}
            onHold={onHold}
            onNoShow={onNoShow}
            onTriage={goToTriage}
            onConsult={goToEncounter}
          />
        )}
      </section>

      <section
        aria-labelledby="waiting-heading"
        className="card overflow-hidden"
      >
        <h2 id="waiting-heading" className="border-b border-stone-200 px-4 py-2 text-xs font-semibold uppercase text-stone-500 dark:border-stone-800">
          {t('queue:board.waiting')}
        </h2>
        {isLoading && snapshot === null && (
          <p className="px-4 py-6 text-center text-sm text-stone-500">{t('common:loading')}</p>
        )}
        {!isLoading && (snapshot?.waiting.length ?? 0) === 0 && (
          <p className="px-4 py-6 text-center text-sm text-stone-500">{t('queue:board.empty_waiting')}</p>
        )}
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {(snapshot?.waiting ?? []).map((ticket) => (
            <li key={ticket.id} className="px-4 py-3">
              <TicketRow
                ticket={ticket}
                canStart={canManage}
                canComplete={false}
                canHold={canManage}
                canNoShow={canManage}
                canTriage={canAssignCategory && ticket.station_code === 'TRI'}
                canConsult={canConsult && ticket.station_code === 'DOC'}
                onStart={onStart}
                onComplete={onComplete}
                onHold={onHold}
                onNoShow={onNoShow}
                onTriage={goToTriage}
                onConsult={goToEncounter}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

interface RowProps {
  ticket: QueueTicket;
  inService?: boolean;
  canStart: boolean;
  canComplete: boolean;
  canHold: boolean;
  canNoShow: boolean;
  canTriage: boolean;
  canConsult?: boolean;
  onStart: (ticket: QueueTicket) => void;
  onComplete: (ticket: QueueTicket) => void;
  onHold: (ticket: QueueTicket) => void;
  onNoShow: (ticket: QueueTicket) => void;
  onTriage: (ticket: QueueTicket) => void;
  onConsult?: (ticket: QueueTicket) => void;
}

function TicketRow(props: RowProps): JSX.Element {
  const { t } = useTranslation(['queue', 'triage', 'common']);
  const { ticket } = props;
  const stateClass =
    ticket.state === 'in_service'
      ? 'ring-2 ring-clinical-info'
      : ticket.state === 'called'
        ? 'ring-2 ring-amber-300 dark:ring-amber-700'
        : '';

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-md p-2', stateClass)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-base font-semibold">{ticket.ticket_number}</span>
        {ticket.mts_category !== null && (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1',
              MTS_COLOR[ticket.mts_category],
            )}
          >
            {t(MTS_LABEL[ticket.mts_category])}
          </span>
        )}
        {ticket.priority === 'emergency' && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
            {t('queue:board.emergency')}
          </span>
        )}
        <span className="text-sm font-medium">{ticket.patient_name ?? '—'}</span>
        <span className="font-mono text-[10px] text-stone-500">{ticket.patient_number ?? '—'}</span>
        <span className="text-[10px] uppercase text-stone-400">{ticket.state}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {props.canStart && ticket.state !== 'in_service' && ticket.state !== 'completed' && (
          <button
            type="button"
            onClick={() => props.onStart(ticket)}
            className="btn-secondary text-[11px]"
          >
            {t('queue:board.start')}
          </button>
        )}
        {props.canComplete && ticket.state === 'in_service' && (
          <button
            type="button"
            onClick={() => props.onComplete(ticket)}
            className="btn-primary text-[11px]"
          >
            {t('queue:board.complete')}
          </button>
        )}
        {props.canHold && (ticket.state === 'waiting' || ticket.state === 'called') && (
          <button
            type="button"
            onClick={() => props.onHold(ticket)}
            className="btn-ghost text-[11px]"
          >
            {t('queue:board.hold')}
          </button>
        )}
        {props.canNoShow && ticket.state !== 'completed' && ticket.state !== 'no_show' && (
          <button
            type="button"
            onClick={() => props.onNoShow(ticket)}
            className="btn-ghost text-[11px] text-clinical-critical"
          >
            {t('queue:board.no_show')}
          </button>
        )}
        {props.canTriage && (
          <button
            type="button"
            onClick={() => props.onTriage(ticket)}
            className="btn-secondary text-[11px]"
          >
            {t('queue:board.triage')}
          </button>
        )}
        {props.canConsult === true && props.onConsult !== undefined && ticket.state !== 'no_show' && (
          <button
            type="button"
            onClick={() => props.onConsult?.(ticket)}
            className="btn-secondary text-[11px]"
          >
            {t('queue:board.consult')}
          </button>
        )}
      </div>
    </div>
  );
}
