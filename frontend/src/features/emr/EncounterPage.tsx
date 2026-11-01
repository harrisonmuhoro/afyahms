import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PermissionButton } from '@/components/auth/PermissionButton';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  useAddDiagnosis,
  useAcknowledgeSoap,
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
import { Glyph } from '@/components/icons/Glyph';

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
          <Glyph name="arrow_back" size={18} />
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
  const { hasPermission, user } = useAuth();
  const [activeTab, setActiveTab] = useState('SOAP NOTES');
  const note = encounter.soap_note;
  const signed = note?.is_signed ?? false;

  const [soap, setSoap] = useState<SoapInput>({
    subjective: note?.subjective ?? '',
    objective: note?.objective ?? '',
    assessment: note?.assessment ?? '',
    plan: note?.plan ?? '',
  });
  const [showAddendum, setShowAddendum] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSoap({
      subjective: note?.subjective ?? '',
      objective: note?.objective ?? '',
      assessment: note?.assessment ?? '',
      plan: note?.plan ?? '',
    });
  }, [note?.id, note?.subjective, note?.objective, note?.assessment, note?.plan]);

  const saveSoap = useSaveSoap(encounter.id);
  const signSoap = useSignSoap(encounter.id);
  const complete = useCompleteEncounter(encounter.id);

  // Once signed, the note is permanently locked. No edit button ever appears.
  const readOnly = signed || encounter.status === 'completed';

  // Sign button activates as soon as local state has content — no need to save draft first.
  const localNoteEmpty = ![soap.subjective, soap.objective, soap.assessment, soap.plan].some(
    (v) => (v ?? '').trim() !== ''
  );
  const serverNoteEmpty = ![note?.subjective, note?.objective, note?.assessment, note?.plan].some(
    (v) => (v ?? '').trim() !== ''
  );
  const noteIsEmpty = localNoteEmpty && serverNoteEmpty;

  const handleError = (err: unknown): void => {
    setError(err instanceof Error ? err.message : t('errors:generic'));
  };

  const onSave = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setBanner(null);
    try {
      await saveSoap.mutateAsync(soap);
      setBanner(t('emr:saved'));
    } catch (err: unknown) {
      handleError(err);
    }
  };

  const onSign = async (): Promise<void> => {
    setError(null);
    try {
      // Auto-save any unsaved draft content before signing
      const hasUnsavedChanges =
        (soap.subjective ?? '') !== (note?.subjective ?? '') ||
        (soap.objective ?? '') !== (note?.objective ?? '') ||
        (soap.assessment ?? '') !== (note?.assessment ?? '') ||
        (soap.plan ?? '') !== (note?.plan ?? '');

      if (hasUnsavedChanges) {
        await saveSoap.mutateAsync(soap);
      }
      await signSoap.mutateAsync();
      setShowPostSignModal(true);
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

  const isDoctor = user?.roles.includes('doctor') ?? false;
  const isNurse = user?.roles.includes('nurse') ?? false;
  const isAdmin = user?.roles.some((r) => ['hospital-admin', 'superadmin', 'receptionist', 'cashier'].includes(r)) ?? false;
  const [showPostSignModal, setShowPostSignModal] = useState(false);

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
              <span className="text-body-sm text-on-surface-variant">Visit #{encounter.visit_id ?? 'N/A'}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={encounter.status} />
          {signed && (
            <span className="bg-secondary/10 text-secondary px-3 py-1 rounded-md text-[11px] font-bold border border-secondary/20">
              {t('emr:signed_badge')}
            </span>
          )}
        </div>
      </div>

      {/* Post-Sign Modal — appears immediately after signing */}
      {showPostSignModal && (
        <PostSignModal
          encounterId={encounter.id}
          visitId={encounter.visit_id ?? 0}
          patientId={encounter.patient_id}
          signedAt={note?.signed_at ?? null}
          isDoctor={isDoctor}
          isNurse={isNurse}
          isAdmin={isAdmin}
          hasPermission={hasPermission}
          onNavigateToTab={(tab) => { setActiveTab(tab); setShowPostSignModal(false); }}
          onAddAddendum={() => { setShowAddendum(true); setActiveTab('SOAP NOTES'); setShowPostSignModal(false); }}
          onClose={() => {
            setShowPostSignModal(false);
            setBanner('Note signed and locked. Select next steps from the action bar below.');
          }}
        />
      )}

      {/* Post-Signature Action Bar — appears below header once note is signed */}
      {signed && encounter.status !== 'completed' && (
        <PostSignatureActionBar
          encounterId={encounter.id}
          visitId={encounter.visit_id ?? 0}
          patientId={encounter.patient_id}
          signedAt={note?.signed_at ?? null}
          isDoctor={isDoctor}
          isNurse={isNurse}
          isAdmin={isAdmin}
          hasPermission={hasPermission}
          onNavigateToTab={setActiveTab}
          onAddAddendum={() => { setShowAddendum(true); setActiveTab('SOAP NOTES'); }}
        />
      )}

      {/* Three-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
        {/* Left Rail */}
        <div className="lg:col-span-3 space-y-md">
          <div className="bg-white border border-outline-variant rounded-xl p-md shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
            <h3 className="text-label-caps text-on-surface-variant mb-3 flex items-center gap-2">
              <Glyph name="medical_services" size={18} />
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
              <Glyph name="prescriptions" size={18} />
              Current Medications
            </h3>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 p-2 rounded-lg bg-surface-container-low">
                <Glyph name="pill" size={18} className="text-primary mt-0.5" />
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
              <Glyph name="expand_more" size={18} />
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
              <div className="space-y-md">
                {/* Locked note view — always read-only once signed */}
                <form onSubmit={onSave} className="space-y-md">
                  <div className="flex items-center justify-between">
                    <h2 className="text-body-sm font-semibold text-on-surface">{t('emr:soap_note')}</h2>
                    {signed && (
                      <span className="text-[11px] text-tertiary flex items-center gap-1">
                        <Glyph name="lock" size={14} />
                        Signed — read only
                      </span>
                    )}
                  </div>
                  <div className="space-y-4">
                    <SoapField label={t('emr:soap.subjective')} value={soap.subjective ?? ''} readOnly={readOnly} onChange={(v) => setSoap((s) => ({ ...s, subjective: v }))} />
                    <SoapField label={t('emr:soap.objective')} value={soap.objective ?? ''} readOnly={readOnly} onChange={(v) => setSoap((s) => ({ ...s, objective: v }))} />
                    <SoapField label={t('emr:soap.assessment')} value={soap.assessment ?? ''} readOnly={readOnly} onChange={(v) => setSoap((s) => ({ ...s, assessment: v }))} />
                    <SoapField label={t('emr:soap.plan')} value={soap.plan ?? ''} readOnly={readOnly} onChange={(v) => setSoap((s) => ({ ...s, plan: v }))} />
                  </div>

                  {/* Unsigned state: Save + Sign */}
                  {!signed && encounter.status !== 'completed' && (
                    <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-outline-variant">
                      <PermissionButton
                        permission="emr.update"
                        type="submit"
                        disabled={saveSoap.isPending}
                        className="bg-surface-container-high text-on-surface px-4 py-2 rounded-md font-semibold text-body-sm hover:bg-surface-container-highest disabled:opacity-50"
                      >
                        {saveSoap.isPending ? 'Saving...' : t('emr:save_draft')}
                      </PermissionButton>
                      <PermissionButton
                        permission="emr.sign"
                        type="button"
                        onClick={onSign}
                        disabled={signSoap.isPending || noteIsEmpty}
                        title={noteIsEmpty ? t('emr:sign_requires_content') : undefined}
                        className="bg-primary text-white px-4 py-2 rounded-md font-semibold text-body-sm hover:bg-primary/90 disabled:opacity-50"
                      >
                        {signSoap.isPending ? t('emr:signing') : t('emr:sign')}
                      </PermissionButton>
                    </div>
                  )}
                </form>

                {/* Addendum section — only visible when triggered from action bar */}
                {signed && showAddendum && (
                  <AddendumForm
                    encounterId={encounter.id}
                    onCancel={() => setShowAddendum(false)}
                    onSuccess={() => {
                      setShowAddendum(false);
                      setBanner('Addendum saved and appended to the record.');
                    }}
                    onError={handleError}
                  />
                )}
              </div>
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

        {/* Right Rail: Completion */}
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
                  <Glyph name="biotech" size={16} />
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Lab</span>
              </div>
              <div className="z-10 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-white text-on-surface-variant flex items-center justify-center border-2 border-outline-variant shadow-sm">
                  <Glyph name="radiology" size={16} />
                </div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase">Imaging</span>
              </div>
              <div className="z-10 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-white text-on-surface-variant flex items-center justify-center border-2 border-outline-variant shadow-sm">
                  <Glyph name="medication" size={16} />
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

/* ─── Post-Signature Action Bar ─────────────────────────────────────────── */

interface PostSignatureActionBarProps {
  encounterId: number;
  visitId: number;
  patientId: number;
  signedAt: string | null;
  isDoctor: boolean;
  isNurse: boolean;
  isAdmin: boolean;
  hasPermission: (p: string) => boolean;
  onNavigateToTab: (tab: string) => void;
  onAddAddendum: () => void;
}

function PostSignatureActionBar({
  encounterId,
  visitId,
  patientId,
  signedAt,
  isDoctor,
  isNurse,
  isAdmin,
  hasPermission,
  onNavigateToTab,
  onAddAddendum,
}: PostSignatureActionBarProps): JSX.Element {
  const navigate = useNavigate();
  const acknowledgeApi = useAcknowledgeSoap(encounterId);
  const [ackDone, setAckDone] = useState(false);
  const [ackError, setAckError] = useState<string | null>(null);

  const onAcknowledge = async (): Promise<void> => {
    setAckError(null);
    try {
      await acknowledgeApi.mutateAsync();
      setAckDone(true);
    } catch (err: unknown) {
      setAckError(err instanceof Error ? err.message : 'Failed to acknowledge');
    }
  };

  const ActionBtn = ({
    icon,
    label,
    onClick,
    primary = false,
    disabled = false,
  }: {
    icon: string;
    label: string;
    onClick: () => void;
    primary?: boolean;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg text-body-sm font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        primary
          ? 'bg-primary text-white border-primary hover:bg-primary/90'
          : 'bg-white text-on-surface border-outline-variant hover:border-primary/40 hover:bg-primary/5'
      )}
    >
      <Glyph name={icon} size={18} />
      {label}
    </button>
  );

  return (
    <div className="bg-white border border-outline-variant rounded-xl p-md shadow-[0px_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-label-caps text-on-surface-variant">Next Actions</p>
        {signedAt !== null && (
          <span className="text-[11px] text-tertiary flex items-center gap-1">
            <Glyph name="lock" size={14} />
            Signed {new Date(signedAt).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        )}
      </div>
      {ackError !== null && (
        <p className="text-[11px] text-error mb-2">{ackError}</p>
      )}
      <div className="flex flex-wrap gap-2">

        {/* ── Doctor actions ── */}
        {isDoctor && hasPermission('prescriptions.create') && (
          <ActionBtn
            icon="medication"
            label="Send to Pharmacy"
            primary
            onClick={() => onNavigateToTab('PRESCRIPTIONS')}
          />
        )}
        {isDoctor && hasPermission('appointments.create') && (
          <ActionBtn
            icon="event"
            label="Schedule Follow-Up"
            primary
            onClick={() => navigate(`/appointments/new?patient_id=${patientId}&type=follow_up`)}
          />
        )}
        {isDoctor && hasPermission('lab.order') && (
          <ActionBtn
            icon="biotech"
            label="Order Labs"
            onClick={() => onNavigateToTab('ORDERS')}
          />
        )}
        {isDoctor && hasPermission('radiology.order') && (
          <ActionBtn
            icon="radiology"
            label="Order Imaging"
            onClick={() => onNavigateToTab('ORDERS')}
          />
        )}
        {isDoctor && hasPermission('referrals.create') && (
          <ActionBtn
            icon="transfer_within_a_station"
            label="Refer Patient"
            onClick={() => navigate(`/referrals/new?patient_id=${patientId}&visit_id=${visitId}`)}
          />
        )}
        {isDoctor && hasPermission('emr.amend') && (
          <ActionBtn
            icon="edit_note"
            label="Add Addendum"
            onClick={onAddAddendum}
          />
        )}

        {/* ── Nurse actions ── */}
        {isNurse && hasPermission('vitals.create') && (
          <ActionBtn
            icon="monitor_heart"
            label="Record Vitals"
            onClick={() => onNavigateToTab('SOAP NOTES')}
          />
        )}
        {isNurse && hasPermission('mar.administer') && (
          <ActionBtn
            icon="vaccines"
            label="Administer Medication"
            onClick={() => onNavigateToTab('ORDERS')}
          />
        )}
        {isNurse && hasPermission('emr.acknowledge') && (
          <ActionBtn
            icon={ackDone ? 'check_circle' : 'check_circle_outline'}
            label={ackDone ? 'Acknowledged ✓' : acknowledgeApi.isPending ? 'Acknowledging...' : 'Acknowledge'}
            disabled={acknowledgeApi.isPending || ackDone}
            onClick={() => void onAcknowledge()}
          />
        )}

        {/* ── Admin actions ── */}
        {isAdmin && hasPermission('invoices.create') && (
          <ActionBtn
            icon="receipt_long"
            label="Generate Invoice"
            onClick={() => navigate(`/billing/invoices/new?visit_id=${visitId}`)}
          />
        )}
        {isAdmin && hasPermission('appointments.create') && (
          <ActionBtn
            icon="event"
            label="Book Follow-Up"
            onClick={() => navigate(`/appointments/new?patient_id=${patientId}&type=follow_up`)}
          />
        )}
        {isAdmin && hasPermission('documents.download') && (
          <ActionBtn
            icon="summarize"
            label="Download Summary"
            onClick={() => window.print()}
          />
        )}

        {/* ── Export PDF — all roles with soap_notes.export_pdf ── */}
        {hasPermission('soap_notes.export_pdf') && (
          <ActionBtn
            icon="print"
            label="Print / Export"
            onClick={() => window.print()}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Post-Sign Modal ───────────────────────────────────────────────────── */

function PostSignModal({
  encounterId,
  visitId,
  patientId,
  signedAt,
  isDoctor,
  isNurse,
  isAdmin,
  hasPermission,
  onNavigateToTab,
  onAddAddendum,
  onClose,
}: PostSignatureActionBarProps & { onClose: () => void }): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-outline-variant flex items-start justify-between">
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <Glyph name="lock" size={24} className="text-primary" />
              Note Signed and Locked
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              The SOAP note has been finalized. What would you like to do next?
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container p-2 rounded-full transition-colors"
          >
            <Glyph name="close" />
          </button>
        </div>
        <div className="p-6">
          <PostSignatureActionBar
            encounterId={encounterId}
            visitId={visitId}
            patientId={patientId}
            signedAt={signedAt}
            isDoctor={isDoctor}
            isNurse={isNurse}
            isAdmin={isAdmin}
            hasPermission={hasPermission}
            onNavigateToTab={onNavigateToTab}
            onAddAddendum={onAddAddendum}
          />
        </div>
        <div className="p-4 bg-surface-container-low border-t border-outline-variant flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-primary text-white rounded-lg font-bold text-body-sm hover:bg-primary/90 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Addendum Form ─────────────────────────────────────────────────────── */

function AddendumForm({
  encounterId,
  onCancel,
  onSuccess,
  onError,
}: {
  encounterId: number;
  onCancel: () => void;
  onSuccess: () => void;
  onError: (err: unknown) => void;
}): JSX.Element {
  const amendSoap = useAmendSoap(encounterId);
  const [text, setText] = useState('');

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      // The amend endpoint appends — the original fields are sent as empty strings
      // so only the addendum text is new content.
      await amendSoap.mutateAsync({
        subjective: '',
        objective: '',
        assessment: '',
        plan: text.trim(),
      });
      onSuccess();
    } catch (err: unknown) {
      onError(err);
    }
  };

  return (
    <div className="border border-secondary/30 rounded-lg p-md bg-secondary/5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-body-sm font-semibold text-on-surface">Add Addendum</h3>
        <span className="text-[11px] text-tertiary">
          Appended to the original — original text cannot be altered
        </span>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          rows={4}
          required
          placeholder="Enter addendum text..."
          className="w-full p-3 border border-outline-variant rounded-lg text-body-md outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/10 bg-white transition-all"
        />
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-tertiary hover:text-on-surface text-body-sm font-semibold"
          >
            Cancel
          </button>
          <PermissionButton
            permission="emr.amend"
            type="submit"
            disabled={amendSoap.isPending || !text.trim()}
            className="bg-secondary text-white px-4 py-2 rounded-md font-semibold text-body-sm hover:bg-secondary/90 disabled:opacity-50"
          >
            {amendSoap.isPending ? 'Saving...' : 'Save Addendum'}
          </PermissionButton>
        </div>
      </form>
    </div>
  );
}

/* ─── Diagnoses Section ─────────────────────────────────────────────────── */

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
                  <Glyph name="delete" size={18} />
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
            <Glyph name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
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

/* ─── SOAP Field ────────────────────────────────────────────────────────── */

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

/* ─── Status Badge ──────────────────────────────────────────────────────── */

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
      {status === 'completed' && <Glyph name="check_circle" size={14} />}
      {t(`emr:status.${status}`)}
    </span>
  );
}
