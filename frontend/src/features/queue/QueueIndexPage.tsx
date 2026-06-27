import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStations } from './api';
import type { StationCode } from './types';

const STATION_DESC: Record<StationCode, string> = {
  REC: 'queue:desc.rec',
  TRI: 'queue:desc.tri',
  DOC: 'queue:desc.doc',
  LAB: 'queue:desc.lab',
  RAD: 'queue:desc.rad',
  PHA: 'queue:desc.pha',
  BIL: 'queue:desc.bil',
};

export function QueueIndexPage(): JSX.Element {
  const { t } = useTranslation(['queue', 'common']);
  const { data, isLoading } = useStations();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            {t('queue:title')}
          </h1>
          <p className="text-xs text-stone-500">{t('queue:subtitle')}</p>
        </div>
        <Link to="/queue/check-in" className="btn-primary text-sm">
          {t('queue:check_in.title')}
        </Link>
      </div>

      {isLoading && (
        <p className="text-sm text-stone-500">{t('common:loading')}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((station) => (
          <Link
            key={station.code}
            to={`/queue/board/${station.code}`}
            className="card block p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-stone-500">{station.code}</span>
              <span
                className={
                  station.status === 'open'
                    ? 'rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-green-800 dark:bg-green-950/40 dark:text-green-200'
                    : 'rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-stone-700 dark:bg-stone-800 dark:text-stone-200'
                }
              >
                {t(`queue:status.${station.status}`)}
              </span>
            </div>
            <h2 className="mt-1 text-base font-semibold">{station.name}</h2>
            <p className="mt-1 text-xs text-stone-500">{t(STATION_DESC[station.code as StationCode])}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
