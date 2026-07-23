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
import { OrdersSection } from './OrdersSection';
import { PrescriptionsSection } from './PrescriptionsSection';
import { AttachmentsSection } from './AttachmentsSection';
import type { Disposition, Encounter, SoapInput } from './types';
import { cn } from '@/lib/cn';

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
    return <p className="text-body-sm text-error p-lg">{t('emr:errors.no_visit')}</p>;
  }

  return (
    <div className="p-lg space-y-lg min-h-[calc(100vh-64px)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">{t('emr:title')}</h1>
          <p className="text-body-sm text-tertiary">
            {t('emr:subtitle')} · {t('emr:visit')} #{visitId}
          </p>
        </div>
        <Link to="/queue/board/DOC" className="text-primary hover:underline font-semibold text-body-sm flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {t('common:back')}
        </Link>
      </div>

      {error !== null && (
        <div role="alert" className="rounded-md bg-error/10 px-4 py-3 text-body-sm text-error border border-error/20">
          {error}
        </div>
      )}

      {isLoading && encounter === null ? (
        <p className="text-body-sm text-tertiary">{t('common:loading')}</p>
      ) : encounter === null ? (
        <div className="bg-white border border-outline-variant rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.05)] space-y-3 p-lg text-center">
          <p className="text-body-sm text-on-surface-variant">{t('emr:no_encounter')}</p>
          <PermissionButton
            permission="emr.create"
            type="button"
            onClick={onOpen}
            disabled={openEncounter.isPending}
            className="bg-primary text-white px-6 py-2 rounded-lg font-bold text-body-sm disabled:opacity-50 inline-flex items-center gap-2"
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
  const [activeTab, setActiveTab] = useState('SOAP NOTES');
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
    <div className="space-y-lg">
      {banner !== null && (
        <div role="status" className="rounded-md bg-secondary/10 px-4 py-3 text-body-sm text-secondary border border-secondary/20 font-medium">
          {banner}
        </div>
      )}
      {error !== null && (
        <div role="alert" className="rounded-md bg-error/10 px-4 py-3 text-body-sm text-error border border-error/20 font-medium">
          {error}
        </div>
      )}

      {/* Patient Identity Header */}
      <div className="bg-white border border-outline-variant rounded-xl p-md flex items-center justify-between shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-md">
          <div className="w-16 h-16 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center text-headline-lg font-bold">
            P
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-headline-md font-bold">{t('emr:patient')} #{encounter.patient_id}</h2>
              {encounter.chief_complaint && (
                <span className="font-data-mono text-[11px] text-on-surface-variant px-2 py-0.5 bg-surface-container rounded">
                  CC: {encounter.chief_complaint}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-body-sm text-on-surface-variant">Visit #{encounter.visit_id ?? 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={encounter.status} />
          {signed && <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-md text-[11px] font-bold border border-secondary/20">{t('emr:signed_badge')}</span>}
        </div>
      </div>

      {/* Three-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Left Rail: Patient Summary (Placeholder/Static for design match) */}
        <div className="lg:col-span-3 space-y-md">
          <div className="bg-white border border-outline-variant rounded-xl p-md shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <h3 className="text-label-caps text-on-surface-variant mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">medical_services</span>
              Problem List
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="bg-surface-container-highest text-on-surface px-2.5 py-1 rounded-md text-[11px] border border-outline-variant">
                Type 2 Diabetes
              </span>
              <span className="bg-surface-container-highest text-on-surface px-2.5 py-1 rounded-md text-[11px] border border-outline-variant">
                Hypertension
              </span>
            </div>
          </div>
          <div className="bg-white border border-outline-variant rounded-xl p-md shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <h3 className="text-label-caps text-on-surface-variant mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">prescriptions</span>
              Current Medications
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 p-2 rounded-lg bg-surface-container-low">
                <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">pill</span>
                <div>
                  <p className="text-body-sm font-semibold">Metformin 500mg</p>
                  <p className="text-[11px] text-on-surface-variant">1 tab twice daily</p>
                </div>
              </li>
            </ul>
          </div>
          <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <div className="p-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center cursor-pointer">
              <h3 className="text-label-caps text-on-surface-variant">Visit History</h3>
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </div>
            <div className="divide-y divide-outline-variant">
              <div className="p-md hover:bg-surface-container-highest cursor-pointer">
                <p className="text-body-sm font-semibold">Follow-up</p>
                <p className="text-[11px] text-on-surface-variant">Oct 20, 2023</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Encounter Workspace */}
        <div className="lg:col-span-6 bg-white border border-outline-variant rounded-xl shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden min-h-[500px]">
          <div className="flex items-center px-md border-b border-outline-variant bg-surface-container-low h-12 overflow-x-auto">
            <nav className="flex gap-lg h-full">
              {['SOAP NOTES', 'DIAGNOSIS', 'ORDERS', 'PRESCRIPTIONS', 'ATTACHMENTS'].map((tab) => (
                <button
                  key={tab}
                  className={cn(
                    'text-label-caps h-full flex items-center px-1 transition-colors relative whitespace-nowrap',
                    activeTab === tab ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                  )}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                  )}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex-1 p-md space-y-md">
            {activeTab === 'SOAP NOTES' && (
              <form onSubmit={onSave} className="space-y-md">
                <div className="flex items-center justify-between">
                  <h2 className="text-body-sm font-semibold text-on-surface">
                    {amendMode ? t('emr:amendment') : t('emr:soap_note')}
                  </h2>
                </div>
                <div className="space-y-4">
                  <SoapField label={t('emr:soap.subjective')} value={soap.subjective ?? ''} readOnly={readOnly} onChange={(v) => setSoap((s) => ({ ...s, subjective: v }))} />
                  <SoapField label={t('emr:soap.objective')} value={soap.objective ?? ''} readOnly={readOnly} onChange={(v) => setSoap((s) => ({ ...s, objective: v }))} />
                  <SoapField label={t('emr:soap.assessment')} value={soap.assessment ?? ''} readOnly={readOnly} onChange={(v) => setSoap((s) => ({ ...s, assessment: v }))} />
                  <SoapField label={t('emr:soap.plan')} value={soap.plan ?? ''} readOnly={readOnly} onChange={(v) => setSoap((s) => ({ ...s, plan: v }))} />
                </div>
                
                <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-outline-variant">
                  {signed && !amendMode && encounter.status !== 'completed' && (
                    <PermissionButton permission="emr.amend" type="button" onClick={() => setAmendMode(true)} className="px-4 py-2 border border-outline-variant rounded-md text-body-sm font-semibold hover:bg-surface-container">
                      {t('emr:amend')}
                    </PermissionButton>
                  )}
                  {amendMode && (
                    <button type="button" onClick={() => setAmendMode(false)} className="px-4 py-2 text-tertiary hover:text-on-surface text-body-sm font-semibold">
                      {t('common:cancel')}
                    </button>
                  )}
                  {!readOnly && (
                    <PermissionButton permission="emr.update" type="submit" disabled={saveSoap.isPending || amendSoap.isPending} className="bg-surface-container-high text-on-surface px-4 py-2 rounded-md font-semibold text-body-sm hover:bg-surface-container-highest disabled:opacity-50">
                      {amendMode ? t('emr:save_amendment') : t('emr:save_draft')}
                    </PermissionButton>
                  )}
                  {!signed && !amendMode && encounter.status !== 'completed' && (
                    <PermissionButton permission="emr.sign" type="button" onClick={onSign} disabled={signSoap.isPending || noteIsEmpty} title={noteIsEmpty ? t('emr:sign_requires_content') : undefined} className="bg-primary text-white px-4 py-2 rounded-md font-semibold text-body-sm hover:bg-primary-container disabled:opacity-50">
                      {signSoap.isPending ? t('emr:signing') : t('emr:sign')}
                    </PermissionButton>
                  )}
                </div>
              </form>
            )}

            {activeTab === 'DIAGNOSIS' && (
              <DiagnosesSection encounter={encounter} />
            )}

            {activeTab === 'ORDERS' && (
              <OrdersSection visitId={encounter.visit_id ?? 0} />
            )}

            {activeTab === 'PRESCRIPTIONS' && (
              <PrescriptionsSection patientId={encounter.patient_id} />
            )}

            {activeTab === 'ATTACHMENTS' && (
              <AttachmentsSection />
            )}
          </div>
        </div>

        {/* Right Rail: Orders Cart & Completion */}
        <div className="lg:col-span-3 space-y-md">
          {encounter.status !== 'completed' && (
            <div className="bg-white border border-outline-variant rounded-xl p-md shadow-[0px_1px_3px_rgba(0,0,0,0.05)] space-y-md">
              <h3 className="text-label-caps text-on-surface-variant">Complete Encounter</h3>
              <div className="space-y-2">
                <p className="text-[11px] text-tertiary mb-2">Select a disposition to close this encounter:</p>
                <div className="flex flex-col gap-2">
                  {DISPOSITIONS.map((d) => (
                    <PermissionButton
                      key={d}
                      permission="emr.update"
                      type="button"
                      onClick={() => void onComplete(d)}
                      disabled={complete.isPending}
                      className="w-full text-left px-3 py-2 border border-outline-variant rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-colors text-body-sm font-medium disabled:opacity-50"
                    >
                      {t(`emr:disposition.${d}`)}
                    </PermissionButton>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-outline-variant rounded-xl p-md shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <h3 className="text-label-caps text-on-surface-variant mb-4">Next Steps Pipeline</h3>
            <div className="relative flex items-center justify-between">
              <div className="absolute left-0 top-1/2 w-full h-[2px] bg-surface-container-high -z-0"></div>
              <div className="z-10 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-white text-on-surface-variant flex items-center justify-center border-2 border-outline-variant shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">biotech</span>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Lab</span>
              </div>
              <div className="z-10 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-white text-on-surface-variant flex items-center justify-center border-2 border-outline-variant shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">radiology</span>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Imaging</span>
              </div>
              <div className="z-10 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-white text-on-surface-variant flex items-center justify-center border-2 border-outline-variant shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">medication</span>
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Pharmacy</span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
    <div className="space-y-4">
      <h2 className="text-body-sm font-semibold text-on-surface">{t('emr:diagnoses')}</h2>

      {encounter.diagnoses.length === 0 ? (
        <p className="text-body-sm text-tertiary">{t('emr:no_diagnoses')}</p>
      ) : (
        <ul className="space-y-2">
          {encounter.diagnoses.map((dx) => (
            <li key={dx.id} className="flex items-center justify-between rounded-lg bg-surface-container-low px-3 py-2 border border-outline-variant">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-data-mono text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{dx.icd10_code}</span>
                  <span className="text-body-sm font-medium text-on-surface">{dx.description}</span>
                </div>
                <span className="text-[10px] uppercase text-tertiary mt-1 block">{t(`emr:diagnosis_type.${dx.diagnosis_type}`)}</span>
              </div>
              {editable && (
                <PermissionButton
                  permission="diagnoses.delete"
                  type="button"
                  onClick={() => void removeDiagnosis.mutateAsync(dx.id)}
                  className="text-error hover:bg-error/10 p-1.5 rounded transition-colors"
                  title={t('common:remove')}
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </PermissionButton>
              )}
            </li>
          ))}
        </ul>
      )}

      {error !== null && <p className="text-body-sm text-error">{error}</p>}

      {editable && (
        <div className="pt-2 space-y-2 relative">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.currentTarget.value)}
              placeholder={t('emr:diagnosis_search_placeholder')}
              className="w-full bg-white border border-outline-variant rounded-md pl-10 pr-3 py-2 text-body-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
          {term.trim().length >= 2 && (
            <ul className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto rounded-md border border-outline-variant bg-white shadow-lg">
              {isLoading ? (
                <li className="px-3 py-2 text-body-sm text-tertiary">{t('common:loading')}</li>
              ) : results.length === 0 ? (
                <li className="px-3 py-2 text-body-sm text-tertiary">{t('emr:no_catalog_results')}</li>
              ) : (
                results.map((entry) => (
                  <li key={entry.id}>
                    <PermissionButton
                      permission="diagnoses.create"
                      type="button"
                      onClick={() => void onAdd(entry.code, entry.description)}
                      disabled={addDiagnosis.isPending}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface-container-low transition-colors disabled:opacity-50"
                    >
                      <span className="font-data-mono text-[11px] font-bold text-primary">{entry.code}</span>
                      <span className="text-on-surface">{entry.description}</span>
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
    <div className="space-y-1">
      <label className="text-label-caps text-on-surface-variant">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        readOnly={readOnly}
        rows={3}
        className={cn(
          'w-full p-3 border border-outline-variant rounded-lg text-body-md outline-none transition-all',
          readOnly
            ? 'bg-surface-container-low text-tertiary cursor-default'
            : 'focus:border-primary focus:ring-2 focus:ring-primary/10 bg-white'
        )}
      />
    </div>
  );
}

function StatusBadge({ status }: { status: Encounter['status'] }): JSX.Element {
  const { t } = useTranslation(['emr']);
  const styles: Record<Encounter['status'], string> = {
    open: 'bg-surface-container text-on-surface-variant border border-outline-variant',
    in_progress: 'bg-secondary/10 text-secondary border border-secondary/20',
    completed: 'bg-primary/10 text-primary border border-primary/20',
    cancelled: 'bg-error/10 text-error border border-error/20',
  };
  return (
    <span className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-label-caps', styles[status])}>
      {status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />}
      {status === 'completed' && <span className="material-symbols-outlined text-[14px]">check_circle</span>}
      {t(`emr:status.${status}`)}
    </span>
  );
}
