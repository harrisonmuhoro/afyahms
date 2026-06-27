import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { usePatients } from './api';

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

      {error !== null && (
        <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-clinical-critical dark:bg-red-950/40">
          {t('errors:generic')}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500 dark:border-stone-800 dark:bg-stone-900/60">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">{t('patients:fields.patient_number')}</th>
              <th scope="col" className="px-4 py-2 font-medium">{t('patients:fields.full_name')}</th>
              <th scope="col" className="px-4 py-2 font-medium">{t('patients:fields.gender')}</th>
              <th scope="col" className="px-4 py-2 font-medium">{t('patients:fields.age')}</th>
              <th scope="col" className="px-4 py-2 font-medium">{t('patients:fields.phone')}</th>
              <th scope="col" className="px-4 py-2 font-medium">{t('patients:fields.sha_number')}</th>
              <th scope="col" className="px-4 py-2 font-medium text-right">{t('common:actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-stone-500">
                  {t('common:loading')}
                </td>
              </tr>
            )}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-stone-500">
                  {t('patients:empty')}
                </td>
              </tr>
            )}
            {data.map((patient) => (
              <tr key={patient.id} className="hover:bg-stone-50 dark:hover:bg-stone-900/40">
                <td className="px-4 py-2 font-mono text-xs">{patient.patient_number}</td>
                <td className="px-4 py-2 font-medium">
                  <Link to={`/patients/${patient.id}`} className="text-brand-700 hover:underline dark:text-brand-300">
                    {patient.full_name}
                  </Link>
                  {patient.deceased && (
                    <span className="ml-2 badge bg-stone-300 text-stone-700 text-[10px]">
                      {t('patients:badges.deceased')}
                    </span>
                  )}
                  {!patient.is_active && (
                    <span className="ml-2 badge bg-amber-100 text-amber-800 text-[10px]">
                      {t('patients:badges.inactive')}
                    </span>
                  )}
                  {patient.merged_into !== null && (
                    <span className="ml-2 badge bg-stone-200 text-stone-700 text-[10px]">
                      {t('patients:badges.merged')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-stone-600 dark:text-stone-300">
                  {patient.gender === null ? '—' : t(`patients:gender.${patient.gender}`)}
                </td>
                <td className="px-4 py-2 text-stone-600 dark:text-stone-300">
                  {patient.age ?? '—'}
                </td>
                <td className="px-4 py-2 text-stone-600 dark:text-stone-300">
                  {patient.phone ?? '—'}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-stone-500">
                  {patient.sha_number ?? '—'}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    to={`/patients/${patient.id}`}
                    className="text-xs text-brand-700 hover:underline dark:text-brand-300"
                  >
                    {t('common:edit')}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
