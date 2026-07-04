import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { PermissionButton } from '@/components/auth/PermissionButton';
import {
  useAddDiagnosis,
  useAmendSoap,
  useCompleteEncounter,
  useDiagnosisCatalogSearch,
  useEncounterByVisit,
  useOpenEncounter,
  useRemoveDiagnosis,
  useSaveSoap,
  useSignSoap,
} from './api';
import type { Disposition, Encounter, SoapInput } from './types';

const DISPOSITIONS: Disposition[] = ['discharged', 'admitted', 'referred', 'followup', 'deceased', 'none'];

export function EncounterPage(): JSX.Element {
  const { t } = useTranslation(['emr', 'common', 'errors']);
  const { visitId: visitIdRaw } = useParams<{ visitId: string }>();
  const visitId = visitIdRaw !== undefined ? Number(visitIdRaw) : NaN;

  const { encounter, isLoading } = useEncounterByVisit(visitId);
  const openEncounter = useOpenEncounter();
  const [error, setError] = useState<string | null>(null);

  const onOpen = async (): Promise<void> => {
    setError(null);
    try {
      await openEncounter.mutateAsync({ visit_id: visitId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors:generic'));
    }
  };

  if (Number.isNaN(visitId) || visitId <= 0) {
    return <p className="text-sm text-amber-700">{t('emr:errors.no_visit')}</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">{t('emr:title')}</h1>
          <p className="text-xs text-stone-500">
            {t('emr:subtitle')} · {t('emr:visit')} #{visitId}
          </p>
        </div>
        <Link to="/queue/board/DOC" className="btn-ghost text-xs">
          ← {t('common:back')}
        </Link>
      </div>

      {error !== null && (
        <div role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {error}
        </div>
      )}

      {isLoading && encounter === null ? (
        <p className="text-sm text-stone-500">{t('common:loading')}</p>
      ) : encounter === null ? (
        <div className="card space-y-3 p-6 text-center">
          <p className="text-sm text-stone-600 dark:text-stone-300">{t('emr:no_encounter')}</p>
          <PermissionButton
            permission="emr.create"
            type="button"
            onClick={onOpen}
            disabled={openEncounter.isPending}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {openEncounter.isPending ? t('emr:opening') : t('emr:open_encounter')}
          </PermissionButton>
        </div>
      ) : (
        <EncounterWorkspace encounter={encounter} />
      )}
    </div>
  );
}

function EncounterWorkspace({ encounter }: { encounter: Encounter }): JSX.Element {
  const { t } = useTranslation(['emr', 'common', 'errors']);
  const note = encounter.soap_note;
  const signed = note?.is_signed ?? false;

  const [soap, setSoap] = useState<SoapInput>({
    subjective: note?.subjective ?? '',
    objective: note?.objective ?? '',
    assessment: note?.assessment ?? '',
    plan: note?.plan ?? '',
  });
  const [amendMode, setAmendMode] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the form in sync when the latest note changes (e.g. after sign/amend).
  useEffect(() => {
    if (!amendMode) {
      setSoap({
        subjective: note?.subjective ?? '',
        objective: note?.objective ?? '',
        assessment: note?.assessment ?? '',
        plan: note?.plan ?? '',
      });
    }
  }, [note?.id, note?.subjective, note?.objective, note?.assessment, note?.plan, amendMode]);

  const saveSoap = useSaveSoap(encounter.id);
  const signSoap = useSignSoap(encounter.id);
  const amendSoap = useAmendSoap(encounter.id);
  const complete = useCompleteEncounter(encounter.id);

  const readOnly = (signed && !amendMode) || encounter.status === 'completed';
  const noteIsEmpty = ![note?.subjective, note?.objective, note?.assessment, note?.plan].some((v) => (v ?? '').trim() !== '');

  const handleError = (err: unknown): void => {
    setError(err instanceof Error ? err.message : t('errors:generic'));
  };

  const onSave = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setBanner(null);
    try {
      if (amendMode) {
        await amendSoap.mutateAsync(soap);
        setAmendMode(false);
        setBanner(t('emr:amended'));
      } else {
        await saveSoap.mutateAsync(soap);
        setBanner(t('emr:saved'));
      }
    } catch (err: unknown) {
      handleError(err);
    }
  };

  const onSign = async (): Promise<void> => {
    setError(null);
    try {
      await signSoap.mutateAsync();
      setBanner(t('emr:signed'));
    } catch (err: unknown) {
      handleError(err);
    }
  };

  const onComplete = async (disposition: Disposition): Promise<void> => {
    setError(null);
    try {
      await complete.mutateAsync({ disposition });
      setBanner(t('emr:completed'));
    } catch (err: unknown) {
      handleError(err);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center justify-between gap-2 p-4">
        <div className="text-sm">
          <span className="font-medium">{t('emr:patient')} #{encounter.patient_id}</span>
          {encounter.chief_complaint !== null && (
            <span className="ml-2 text-stone-500">· {encounter.chief_complaint}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={encounter.status} />
          {signed && <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">{t('emr:signed_badge')}</span>}
        </div>
      </div>

      {banner !== null && (
        <div role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          {banner}
        </div>
      )}
      {error !== null && (
        <div role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {error}
        </div>
      )}

      <form onSubmit={onSave} className="card space-y-4 p-4">
        <h2 className="text-sm font-semibold uppercase text-stone-500">
          {amendMode ? t('emr:amendment') : t('emr:soap_note')}
        </h2>
        <SoapField label={t('emr:soap.subjective')} value={soap.subjective ?? ''} readOnly={readOnly} onChange={(v) => setSoap((s) => ({ ...s, subjective: v }))} />
        <SoapField label={t('emr:soap.objective')} value={soap.objective ?? ''} readOnly={readOnly} onChange={(v) => setSoap((s) => ({ ...s, objective: v }))} />
        <SoapField label={t('emr:soap.assessment')} value={soap.assessment ?? ''} readOnly={readOnly} onChange={(v) => setSoap((s) => ({ ...s, assessment: v }))} />
        <SoapField label={t('emr:soap.plan')} value={soap.plan ?? ''} readOnly={readOnly} onChange={(v) => setSoap((s) => ({ ...s, plan: v }))} />

        <div className="flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-3 dark:border-stone-800">
          {signed && !amendMode && encounter.status !== 'completed' && (
            <PermissionButton permission="emr.amend" type="button" onClick={() => setAmendMode(true)} className="btn-secondary text-sm">
              {t('emr:amend')}
            </PermissionButton>
          )}
          {amendMode && (
            <button type="button" onClick={() => setAmendMode(false)} className="btn-ghost text-sm">
              {t('common:cancel')}
            </button>
          )}
          {!readOnly && (
            <PermissionButton permission="emr.update" type="submit" disabled={saveSoap.isPending || amendSoap.isPending} className="btn-primary text-sm disabled:opacity-50">
              {amendMode ? t('emr:save_amendment') : t('emr:save_draft')}
            </PermissionButton>
          )}
          {!signed && !amendMode && encounter.status !== 'completed' && (
            <PermissionButton permission="emr.sign" type="button" onClick={onSign} disabled={signSoap.isPending || noteIsEmpty} title={noteIsEmpty ? t('emr:sign_requires_content') : undefined} className="btn-primary text-sm disabled:opacity-50">
              {signSoap.isPending ? t('emr:signing') : t('emr:sign')}
            </PermissionButton>
          )}
        </div>
      </form>

      <DiagnosesSection encounter={encounter} />

      {encounter.status !== 'completed' && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <span className="text-sm font-medium">{t('emr:complete_encounter')}</span>
          <div className="flex flex-wrap gap-2">
            {DISPOSITIONS.map((d) => (
              <PermissionButton
                key={d}
                permission="emr.update"
                type="button"
                onClick={() => void onComplete(d)}
                disabled={complete.isPending}
                className="btn-secondary text-xs disabled:opacity-50"
              >
                {t(`emr:disposition.${d}`)}
              </PermissionButton>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiagnosesSection({ encounter }: { encounter: Encounter }): JSX.Element {
  const { t } = useTranslation(['emr', 'common', 'errors']);
  const [term, setTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { results, isLoading } = useDiagnosisCatalogSearch(term);
  const addDiagnosis = useAddDiagnosis(encounter.id);
  const removeDiagnosis = useRemoveDiagnosis(encounter.id);

  const editable = encounter.status !== 'completed';

  const onAdd = async (code: string, description: string): Promise<void> => {
    setError(null);
    try {
      await addDiagnosis.mutateAsync({ catalog_code: code, description, diagnosis_type: 'primary' });
      setTerm('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('errors:generic'));
    }
  };

  return (
    <div className="card space-y-3 p-4">
      <h2 className="text-sm font-semibold uppercase text-stone-500">{t('emr:diagnoses')}</h2>

      {encounter.diagnoses.length === 0 ? (
        <p className="text-xs text-stone-500">{t('emr:no_diagnoses')}</p>
      ) : (
        <ul className="space-y-1">
          {encounter.diagnoses.map((dx) => (
            <li key={dx.id} className="flex items-center justify-between rounded-md bg-stone-50 px-3 py-2 text-sm dark:bg-stone-800/50">
              <span>
                <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">{dx.icd10_code}</span>
                <span className="ml-2 text-stone-700 dark:text-stone-200">{dx.description}</span>
                <span className="ml-2 text-[10px] uppercase text-stone-400">{t(`emr:diagnosis_type.${dx.diagnosis_type}`)}</span>
              </span>
              {editable && (
                <PermissionButton
                  permission="diagnoses.delete"
                  type="button"
                  onClick={() => void removeDiagnosis.mutateAsync(dx.id)}
                  className="btn-ghost text-xs text-red-600"
                >
                  {t('common:remove')}
                </PermissionButton>
              )}
            </li>
          ))}
        </ul>
      )}

      {error !== null && <p className="text-xs text-amber-700">{error}</p>}

      {editable && (
        <div className="space-y-2">
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.currentTarget.value)}
            placeholder={t('emr:diagnosis_search_placeholder')}
            className="input"
          />
          {term.trim().length >= 2 && (
            <ul className="max-h-48 overflow-y-auto rounded-md border border-stone-200 dark:border-stone-700">
              {isLoading ? (
                <li className="px-3 py-2 text-xs text-stone-500">{t('common:loading')}</li>
              ) : results.length === 0 ? (
                <li className="px-3 py-2 text-xs text-stone-500">{t('emr:no_catalog_results')}</li>
              ) : (
                results.map((entry) => (
                  <li key={entry.id}>
                    <PermissionButton
                      permission="diagnoses.create"
                      type="button"
                      onClick={() => void onAdd(entry.code, entry.description)}
                      disabled={addDiagnosis.isPending}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-stone-100 disabled:opacity-50 dark:hover:bg-stone-800"
                    >
                      <span className="font-mono text-xs font-semibold text-brand-700 dark:text-brand-300">{entry.code}</span>
                      <span className="text-stone-700 dark:text-stone-200">{entry.description}</span>
                    </PermissionButton>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SoapField({
  label,
  value,
  readOnly,
  onChange,
}: {
  label: string;
  value: string;
  readOnly: boolean;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <label className="flex flex-col text-xs font-medium text-stone-600 dark:text-stone-300">
      {label}
      <textarea
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        readOnly={readOnly}
        rows={3}
        className="input mt-1 disabled:opacity-60 read-only:bg-stone-50 dark:read-only:bg-stone-900"
      />
    </label>
  );
}

function StatusBadge({ status }: { status: Encounter['status'] }): JSX.Element {
  const { t } = useTranslation(['emr']);
  const styles: Record<Encounter['status'], string> = {
    open: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200',
    completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200',
  };
  return <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}>{t(`emr:status.${status}`)}</span>;
}
