import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { usePatients } from '@/features/patients/api';
import { useOpenVisit } from './api';

export function CheckInPage(): JSX.Element {
  const { t } = useTranslation(['queue', 'patients', 'common', 'errors']);
  const navigate = useNavigate();

  const [patientId, setPatientId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [visitType, setVisitType] = useState<'walk_in' | 'appointment' | 'referral' | 'follow_up' | 'emergency'>(
    'walk_in',
  );
  const [error, setError] = useState<string | null>(null);

  const patients = usePatients({ page: 1, perPage: 25, search: search !== '' ? search : undefined });
  const openVisit = useOpenVisit();

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (patientId === null) {
      setError(t('queue:check_in.errors.no_patient'));
      return;
    }
    try {
      await openVisit.mutateAsync({ patient_id: patientId, visit_type: visitType });
      navigate('/queue/board/TRI');
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message !== '' ? err.message : t('errors:generic');
      setError(message);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            {t('queue:check_in.title')}
          </h1>
          <p className="text-xs text-stone-500">{t('queue:check_in.subtitle')}</p>
        </div>
        <Link to="/queue" className="btn-ghost text-xs">
          ← {t('common:back')}
        </Link>
      </div>

      {error !== null && (
        <div
          role="alert"
          className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        >
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="card space-y-4 p-4">
        <label className="flex flex-col text-xs font-medium text-stone-600 dark:text-stone-300">
          {t('queue:check_in.search_patient')}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder={t('patients:placeholders.search')}
            className="input mt-1"
          />
        </label>

        <div className="card max-h-64 overflow-y-auto">
          {patients.isLoading && (
            <p className="px-3 py-4 text-center text-xs text-stone-500">{t('common:loading')}</p>
          )}
          {!patients.isLoading && patients.data.length === 0 && (
            <p className="px-3 py-4 text-center text-xs text-stone-500">
              {t('patients:empty')}
            </p>
          )}
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {patients.data.map((p) => (
              <li key={p.internal_id}>
                <button
                  type="button"
                  onClick={() => setPatientId(p.internal_id)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    patientId === p.internal_id
                      ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/30 dark:text-brand-100'
                      : 'hover:bg-stone-50 dark:hover:bg-stone-900/40'
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{p.full_name}</span>
                    <span className="font-mono text-[10px] text-stone-500">{p.patient_number}</span>
                  </span>
                  <span className="text-[10px] text-stone-500">
                    {p.gender ?? '—'} · {p.age ?? '—'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
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
    </div>
  );
}
