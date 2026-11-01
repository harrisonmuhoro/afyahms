import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { usePatients } from './api';
import { Badge, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import type { Patient } from './types';

export function PatientsPage(): JSX.Element {
  const { t } = useTranslation(['patients', 'common', 'errors']);
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const search = searchParams.get('q') ?? '';
  const gender = (searchParams.get('gender') ?? '') as '' | 'male' | 'female' | 'other';

  const { data, pagination, isLoading, error } = usePatients({
    page,
    perPage: 25,
    search: search !== '' ? search : undefined,
    gender: gender !== '' ? gender : undefined,
  });

  const total = pagination?.total ?? 0;
  const lastPage = pagination?.last_page ?? 1;
  const from = pagination?.from ?? null;
  const to = pagination?.to ?? null;

  const pageRange = useMemo<number[]>(() => {
    if (lastPage <= 1) {
      return [1];
    }
    const start = Math.max(1, page - 2);
    const end = Math.min(lastPage, start + 4);
    const range: number[] = [];
    for (let p = start; p <= end; p += 1) {
      range.push(p);
    }

    return range;
  }, [page, lastPage]);

  const updateParams = (mut: (params: URLSearchParams) => void): void => {
    const next = new URLSearchParams(searchParams);
    mut(next);
    setSearchParams(next, { replace: true });
  };

  const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = (formData.get('q') as string | null)?.trim() ?? '';
    updateParams((p) => {
      if (q === '') {
        p.delete('q');
      } else {
        p.set('q', q);
      }
      p.set('page', '1');
    });
  };

  const onPageChange = (next: number): void => {
    updateParams((p) => p.set('page', String(next)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            {t('patients:title')}
          </h1>
          <p className="text-xs text-stone-500">
            {t('patients:subtitle')}
          </p>
        </div>
        <Link
          to="/patients/new"
          className="btn-primary text-sm"
        >
          {t('patients:create')}
        </Link>
      </div>

      <form onSubmit={onSearchSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs font-medium text-stone-600 dark:text-stone-300">
          {t('patients:fields.search')}
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder={t('patients:placeholders.search')}
            className="input mt-1 w-72"
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-stone-600 dark:text-stone-300">
          {t('patients:fields.gender')}
          <select
            name="gender"
            defaultValue={gender}
            onChange={(e) => {
              const value = e.currentTarget.value;
              updateParams((p) => {
                if (value === '') {
                  p.delete('gender');
                } else {
                  p.set('gender', value);
                }
                p.set('page', '1');
              });
            }}
            className="input mt-1 w-40"
          >
            <option value="">{t('common:all')}</option>
            <option value="male">{t('patients:gender.male')}</option>
            <option value="female">{t('patients:gender.female')}</option>
            <option value="other">{t('patients:gender.other')}</option>
          </select>
        </label>

        <button type="submit" className="btn-secondary text-sm">
          {t('common:search')}
        </button>
      </form>

      {error !== null ? (
        <div className="card">
          <ErrorState title={t('errors:generic')} error={error} />
        </div>
      ) : isLoading ? (
        <div className="card space-y-3 p-4" role="status" aria-label={t('common:loading')}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="card">
          <EmptyState
            title={t('patients:empty')}
            description="Check the spelling, or search by patient number, phone or national ID."
            action={<Link to="/patients/new" className="btn-primary btn-sm">Register patient</Link>}
          />
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <ul className="card divide-y divide-line md:hidden">
            {data.map((patient) => (
              <li key={patient.id}>
                <Link to={`/patients/${patient.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-medium text-ink">{patient.full_name}</span>
                      <PatientFlags patient={patient} t={t} />
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-ink-secondary">{patient.patient_number}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {[patient.gender === null ? null : t(`patients:gender.${patient.gender}`), patient.age !== null ? `${patient.age} yrs` : null, patient.phone]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <span aria-hidden className="text-ink-muted">›</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Tablet and up: table */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">{t('patients:fields.patient_number')}</th>
                  <th scope="col">{t('patients:fields.full_name')}</th>
                  <th scope="col">{t('patients:fields.gender')}</th>
                  <th scope="col">{t('patients:fields.age')}</th>
                  <th scope="col">{t('patients:fields.phone')}</th>
                  <th scope="col">{t('patients:fields.sha_number')}</th>
                  <th scope="col" className="text-right">{t('common:actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((patient) => (
                  <tr key={patient.id}>
                    <td className="whitespace-nowrap font-mono text-xs text-ink-secondary">{patient.patient_number}</td>
                    <td className="font-medium">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link to={`/patients/${patient.id}`} className="text-ink hover:text-primary hover:underline">
                          {patient.full_name}
                        </Link>
                        <PatientFlags patient={patient} t={t} />
                      </div>
                    </td>
                    <td className="text-ink-secondary">
                      {patient.gender === null ? '—' : t(`patients:gender.${patient.gender}`)}
                    </td>
                    <td className="text-ink-secondary">{patient.age ?? '—'}</td>
                    <td className="whitespace-nowrap text-ink-secondary">{patient.phone ?? '—'}</td>
                    <td className="font-mono text-xs text-ink-muted">{patient.sha_number ?? '—'}</td>
                    <td className="text-right">
                      <Link to={`/patients/${patient.id}`} className="btn-ghost btn-sm">
                        {t('common:view', 'Open')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>
          {t('patients:results_summary', {
            from: from ?? 0,
            to: to ?? 0,
            total,
          })}
        </span>
        {lastPage > 1 && (
          <nav className="flex items-center gap-1" aria-label="Pagination">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="btn-ghost text-xs disabled:opacity-40"
            >
              ‹ {t('common:back')}
            </button>
            {pageRange.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => onPageChange(p)}
                className={`rounded-md px-2 py-1 text-xs ${
                  p === page
                    ? 'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200'
                    : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onPageChange(Math.min(lastPage, page + 1))}
              disabled={page >= lastPage}
              className="btn-ghost text-xs disabled:opacity-40"
            >
              {t('common:next')} ›
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}

function PatientFlags({ patient, t }: { patient: Patient; t: (key: string) => string }): JSX.Element {
  return (
    <>
      {patient.deceased && <Badge tone="neutral">{t('patients:badges.deceased')}</Badge>}
      {!patient.is_active && <Badge tone="warning" dot>{t('patients:badges.inactive')}</Badge>}
      {patient.merged_into !== null && <Badge tone="info">{t('patients:badges.merged')}</Badge>}
    </>
  );
}
