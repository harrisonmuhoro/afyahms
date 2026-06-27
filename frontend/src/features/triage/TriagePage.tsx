import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useRecordTriage } from './api';
import type { MtsCategory } from '../queue/types';

const MTS_OPTIONS: Array<{ value: MtsCategory; i18nKey: string; ring: string; bg: string }> = [
  {
    value: 'red',
    i18nKey: 'triage:red',
    ring: 'ring-red-400',
    bg: 'bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200',
  },
  {
    value: 'orange',
    i18nKey: 'triage:orange',
    ring: 'ring-orange-400',
    bg: 'bg-orange-100 text-orange-900 dark:bg-orange-950/50 dark:text-orange-200',
  },
  {
    value: 'yellow',
    i18nKey: 'triage:yellow',
    ring: 'ring-yellow-400',
    bg: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/50 dark:text-yellow-900',
  },
  {
    value: 'green',
    i18nKey: 'triage:green',
    ring: 'ring-green-400',
    bg: 'bg-green-100 text-green-900 dark:bg-green-950/50 dark:text-green-200',
  },
  {
    value: 'blue',
    i18nKey: 'triage:blue',
    ring: 'ring-blue-400',
    bg: 'bg-blue-100 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200',
  },
];

export function TriagePage(): JSX.Element {
  const { t } = useTranslation(['triage', 'queue', 'common', 'errors']);
  const { visitId: visitIdRaw } = useParams<{ visitId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const visitId = visitIdRaw !== undefined ? Number(visitIdRaw) : NaN;
  const ticketId = searchParams.get('ticket');

  const [mts, setMts] = useState<MtsCategory | null>(null);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [tempC, setTempC] = useState('');
  const [pulse, setPulse] = useState('');
  const [respRate, setRespRate] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [spo2, setSpo2] = useState('');
  const [pain, setPain] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recordTriage = useRecordTriage();

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    if (Number.isNaN(visitId) || visitId <= 0) {
      setError(t('queue:check_in.errors.no_patient'));
      return;
    }
    if (mts === null) {
      setError(t('triage:errors.no_category'));
      return;
    }
    try {
      await recordTriage.mutateAsync({
        visit_id: visitId,
        mts_level: mts,
        chief_complaint: chiefComplaint.trim() !== '' ? chiefComplaint.trim() : undefined,
        temperature_c: tempC !== '' ? Number(tempC) : undefined,
        pulse_bpm: pulse !== '' ? Number(pulse) : undefined,
        respiratory_rate: respRate !== '' ? Number(respRate) : undefined,
        systolic_bp: systolic !== '' ? Number(systolic) : undefined,
        diastolic_bp: diastolic !== '' ? Number(diastolic) : undefined,
        spo2_pct: spo2 !== '' ? Number(spo2) : undefined,
        pain_score: pain !== '' ? Number(pain) : undefined,
        notes: notes.trim() !== '' ? notes.trim() : undefined,
      });
      navigate(`/queue/board/DOC`);
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message !== ''
          ? err.message
          : t('errors:generic');
      setError(message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            {t('triage:title')}
          </h1>
          <p className="text-xs text-stone-500">
            {t('triage:subtitle')} {ticketId !== null ? `· #${ticketId}` : ''}
          </p>
        </div>
        <Link to="/queue/board/TRI" className="btn-ghost text-xs">
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
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase text-stone-500">
            {t('triage:mts_label')}
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {MTS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMts(opt.value)}
                className={cn(
                  'rounded-md p-3 text-left text-sm ring-2 transition-shadow',
                  mts === opt.value ? `${opt.ring} ${opt.bg} shadow` : 'ring-stone-200 dark:ring-stone-700 hover:ring-stone-400',
                )}
                aria-pressed={mts === opt.value}
              >
                <span className="block font-mono text-[10px] uppercase">{opt.value}</span>
                <span className="block text-sm font-semibold">{t(opt.i18nKey)}</span>
                <span className="block text-[10px] text-stone-500">{t(`triage:target.${opt.value}`)}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase text-stone-500">
            {t('triage:vitals_label')}
          </legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label={t('triage:vitals.temperature_c')} unit="°C">
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={tempC}
                onChange={(e) => setTempC(e.currentTarget.value)}
                className="input"
              />
            </Field>
            <Field label={t('triage:vitals.pulse_bpm')} unit="bpm">
              <input
                type="number"
                inputMode="numeric"
                value={pulse}
                onChange={(e) => setPulse(e.currentTarget.value)}
                className="input"
              />
            </Field>
            <Field label={t('triage:vitals.respiratory_rate')} unit="/min">
              <input
                type="number"
                inputMode="numeric"
                value={respRate}
                onChange={(e) => setRespRate(e.currentTarget.value)}
                className="input"
              />
            </Field>
            <Field label={t('triage:vitals.spo2_pct')} unit="%">
              <input
                type="number"
                inputMode="numeric"
                value={spo2}
                onChange={(e) => setSpo2(e.currentTarget.value)}
                className="input"
              />
            </Field>
            <Field label={t('triage:vitals.bp_systolic')} unit="mmHg">
              <input
                type="number"
                inputMode="numeric"
                value={systolic}
                onChange={(e) => setSystolic(e.currentTarget.value)}
                className="input"
              />
            </Field>
            <Field label={t('triage:vitals.bp_diastolic')} unit="mmHg">
              <input
                type="number"
                inputMode="numeric"
                value={diastolic}
                onChange={(e) => setDiastolic(e.currentTarget.value)}
                className="input"
              />
            </Field>
            <Field label={t('triage:vitals.pain_score')} unit="0-10">
              <input
                type="number"
                min={0}
                max={10}
                inputMode="numeric"
                value={pain}
                onChange={(e) => setPain(e.currentTarget.value)}
                className="input"
              />
            </Field>
          </div>
        </fieldset>

        <label className="flex flex-col text-xs font-medium text-stone-600 dark:text-stone-300">
          {t('triage:fields.chief_complaint')}
          <input
            type="text"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.currentTarget.value)}
            className="input mt-1"
            placeholder={t('triage:placeholders.complaint')}
          />
        </label>

        <label className="flex flex-col text-xs font-medium text-stone-600 dark:text-stone-300">
          {t('triage:fields.notes')}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            rows={3}
            className="input mt-1"
          />
        </label>

        <div className="flex justify-end gap-2 border-t border-stone-200 pt-3 dark:border-stone-800">
          <Link to="/queue/board/TRI" className="btn-ghost text-sm">
            {t('common:cancel')}
          </Link>
          <button
            type="submit"
            disabled={recordTriage.isPending || mts === null}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {recordTriage.isPending ? t('triage:submitting') : t('triage:submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  unit?: string;
  children: React.ReactNode;
}

function Field({ label, unit, children }: FieldProps): JSX.Element {
  return (
    <label className="flex flex-col text-[11px] font-medium text-stone-600 dark:text-stone-300">
      <span className="mb-1">{label}</span>
      <div className="flex items-center gap-2">
        {children}
        {unit !== undefined && <span className="text-[10px] text-stone-400">{unit}</span>}
      </div>
    </label>
  );
}
