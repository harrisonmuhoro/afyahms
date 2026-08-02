import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon } from '@/components/icons/Icon';
import { useRecordTriage } from './api';
import type { MtsCategory } from '../queue/types';

interface MtsOption {
  value: MtsCategory;
  i18nKey: string;
  fallbackLabel: string;
  /** Top color bar when unselected (tinted) */
  barIdle: string;
  /** Top color bar when selected (filled with the clinical token) */
  barActive: string;
  /** Card treatment when selected */
  selected: string;
  /** Label color when selected */
  labelActive: string;
}

const MTS_OPTIONS: MtsOption[] = [
  {
    value: 'red',
    i18nKey: 'triage:red',
    fallbackLabel: 'Critical',
    barIdle: 'bg-red-200 dark:bg-red-900/60',
    barActive: 'bg-clinical-triage_red',
    selected:
      'border-clinical-triage_red bg-red-50 ring-1 ring-clinical-triage_red dark:bg-red-950/40',
    labelActive: 'text-red-700 dark:text-red-300',
  },
  {
    value: 'orange',
    i18nKey: 'triage:orange',
    fallbackLabel: 'Urgent',
    barIdle: 'bg-orange-200 dark:bg-orange-900/60',
    barActive: 'bg-clinical-triage_orange',
    selected:
      'border-clinical-triage_orange bg-orange-50 ring-1 ring-clinical-triage_orange dark:bg-orange-950/40',
    labelActive: 'text-orange-700 dark:text-orange-300',
  },
  {
    value: 'yellow',
    i18nKey: 'triage:yellow',
    fallbackLabel: 'Semi-Urgent',
    barIdle: 'bg-yellow-200 dark:bg-yellow-900/60',
    barActive: 'bg-clinical-triage_yellow',
    selected:
      'border-clinical-triage_yellow bg-yellow-50 ring-1 ring-clinical-triage_yellow dark:bg-yellow-950/40',
    labelActive: 'text-yellow-700 dark:text-yellow-300',
  },
  {
    value: 'green',
    i18nKey: 'triage:green',
    fallbackLabel: 'Standard',
    barIdle: 'bg-green-200 dark:bg-green-900/60',
    barActive: 'bg-clinical-triage_green',
    selected:
      'border-clinical-triage_green bg-green-50 ring-1 ring-clinical-triage_green dark:bg-green-950/40',
    labelActive: 'text-green-700 dark:text-green-300',
  },
  {
    value: 'blue',
    i18nKey: 'triage:blue',
    fallbackLabel: 'Non-Urgent',
    barIdle: 'bg-blue-200 dark:bg-blue-900/60',
    barActive: 'bg-clinical-triage_blue',
    selected:
      'border-clinical-triage_blue bg-blue-50 ring-1 ring-clinical-triage_blue dark:bg-blue-950/40',
    labelActive: 'text-blue-700 dark:text-blue-300',
  },
];

/** Adult reference ranges used purely for visual out-of-range highlighting. */
const VITAL_RANGES = {
  tempC: { min: 35, max: 38 },
  pulse: { min: 60, max: 100 },
  respRate: { min: 12, max: 20 },
  spo2: { min: 95, max: 100 },
  systolic: { min: 90, max: 140 },
  diastolic: { min: 60, max: 90 },
  pain: { min: 0, max: 6 },
} as const;

function isOutOfRange(raw: string, range: { min: number; max: number }): boolean {
  if (raw === '') return false;
  const n = Number(raw);
  if (Number.isNaN(n)) return false;
  return n < range.min || n > range.max;
}

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
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
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
        weight_kg: weight !== '' ? Number(weight) : undefined,
        height_cm: height !== '' ? Number(height) : undefined,
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

  const vitalInputClass =
    'input font-mono text-base font-medium text-brand-700 dark:text-brand-300';
  const vitalInputErrorClass =
    'input input-error font-mono text-base font-medium text-clinical-triage_red dark:text-red-400';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="page-title">{t('triage:title')}</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">{t('triage:subtitle')}</p>
        </div>
        <Link to="/queue/board/TRI" className="btn-ghost text-xs">
          <Icon name="arrowLeft" size={14} />
          {t('common:back')}
        </Link>
      </div>

      {error !== null && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <Icon name="alertCircle" size={16} className="shrink-0 text-clinical-warning" />
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="card overflow-hidden">
        {/* Patient identity header */}
        <div className="flex flex-wrap items-center gap-4 border-b border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/40">
          <div className="avatar-lg bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            <Icon name="heartPulse" size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              {t('queue:visit', { defaultValue: 'Visit' })}{' '}
              <span className="font-mono">#{Number.isNaN(visitId) ? '—' : visitId}</span>
            </h2>
            {ticketId !== null && (
              <span className="mt-0.5 inline-flex items-center rounded border border-stone-200 bg-white px-2 py-0.5 font-mono text-xs text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300">
                #{ticketId}
              </span>
            )}
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <Icon name="triage" size={12} />
            {t('triage:active_assessment', { defaultValue: 'Active assessment' })}
          </span>
        </div>

        <div className="space-y-8 p-4 sm:p-6">
          {/* ── Vital signs grid ─────────────────────────────────────────── */}
          <fieldset>
            <legend className="section-title mb-3">{t('triage:vitals_label')}</legend>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {/* BP — paired fields in one card */}
              <VitalCard
                className="col-span-2"
                label={`${t('triage:vitals.bp_systolic')} / ${t('triage:vitals.bp_diastolic')}`}
                unit="mmHg"
                outOfRange={
                  isOutOfRange(systolic, VITAL_RANGES.systolic) ||
                  isOutOfRange(diastolic, VITAL_RANGES.diastolic)
                }
                warning={t('triage:out_of_range', { defaultValue: 'Out of range' })}
              >
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={systolic}
                    onChange={(e) => setSystolic(e.currentTarget.value)}
                    aria-label={t('triage:vitals.bp_systolic')}
                    placeholder="120"
                    className={cn(
                      isOutOfRange(systolic, VITAL_RANGES.systolic)
                        ? vitalInputErrorClass
                        : vitalInputClass,
                    )}
                  />
                  <span
                    aria-hidden
                    className="text-lg font-light text-stone-400 dark:text-stone-500"
                  >
                    /
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.currentTarget.value)}
                    aria-label={t('triage:vitals.bp_diastolic')}
                    placeholder="80"
                    className={cn(
                      isOutOfRange(diastolic, VITAL_RANGES.diastolic)
                        ? vitalInputErrorClass
                        : vitalInputClass,
                    )}
                  />
                </div>
              </VitalCard>

              <VitalCard
                label={t('triage:vitals.pulse_bpm')}
                unit="bpm"
                outOfRange={isOutOfRange(pulse, VITAL_RANGES.pulse)}
                warning={t('triage:out_of_range', { defaultValue: 'Out of range' })}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  value={pulse}
                  onChange={(e) => setPulse(e.currentTarget.value)}
                  placeholder="72"
                  className={cn(
                    isOutOfRange(pulse, VITAL_RANGES.pulse)
                      ? vitalInputErrorClass
                      : vitalInputClass,
                  )}
                />
              </VitalCard>

              <VitalCard
                label={t('triage:vitals.respiratory_rate')}
                unit="/min"
                outOfRange={isOutOfRange(respRate, VITAL_RANGES.respRate)}
                warning={t('triage:out_of_range', { defaultValue: 'Out of range' })}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  value={respRate}
                  onChange={(e) => setRespRate(e.currentTarget.value)}
                  placeholder="16"
                  className={cn(
                    isOutOfRange(respRate, VITAL_RANGES.respRate)
                      ? vitalInputErrorClass
                      : vitalInputClass,
                  )}
                />
              </VitalCard>

              <VitalCard
                label={t('triage:vitals.temperature_c')}
                unit="°C"
                outOfRange={isOutOfRange(tempC, VITAL_RANGES.tempC)}
                warning={t('triage:out_of_range', { defaultValue: 'Out of range' })}
              >
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={tempC}
                  onChange={(e) => setTempC(e.currentTarget.value)}
                  placeholder="36.8"
                  className={cn(
                    isOutOfRange(tempC, VITAL_RANGES.tempC)
                      ? vitalInputErrorClass
                      : vitalInputClass,
                  )}
                />
              </VitalCard>

              <VitalCard
                label={t('triage:vitals.spo2_pct')}
                unit="%"
                outOfRange={isOutOfRange(spo2, VITAL_RANGES.spo2)}
                warning={t('triage:low', { defaultValue: 'Low' })}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  value={spo2}
                  onChange={(e) => setSpo2(e.currentTarget.value)}
                  placeholder="98"
                  className={cn(
                    isOutOfRange(spo2, VITAL_RANGES.spo2)
                      ? vitalInputErrorClass
                      : vitalInputClass,
                  )}
                />
              </VitalCard>

              <VitalCard
                label={t('triage:vitals.weight_kg', { defaultValue: 'Weight' })}
                unit="kg"
                outOfRange={false}
                warning=""
              >
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.currentTarget.value)}
                  placeholder="70"
                  className={vitalInputClass}
                />
              </VitalCard>

              <VitalCard
                label={t('triage:vitals.height_cm', { defaultValue: 'Height' })}
                unit="cm"
                outOfRange={false}
                warning=""
              >
                <input
                  type="number"
                  inputMode="numeric"
                  value={height}
                  onChange={(e) => setHeight(e.currentTarget.value)}
                  placeholder="170"
                  className={vitalInputClass}
                />
              </VitalCard>

              <VitalCard
                label={t('triage:vitals.pain_score')}
                unit="0–10"
                outOfRange={isOutOfRange(pain, VITAL_RANGES.pain)}
                warning={t('triage:high', { defaultValue: 'High' })}
              >
                <input
                  type="number"
                  min={0}
                  max={10}
                  inputMode="numeric"
                  value={pain}
                  onChange={(e) => setPain(e.currentTarget.value)}
                  placeholder="0"
                  className={cn(
                    isOutOfRange(pain, VITAL_RANGES.pain)
                      ? vitalInputErrorClass
                      : vitalInputClass,
                  )}
                />
              </VitalCard>
            </div>
          </fieldset>

          {/* ── Chief complaint ──────────────────────────────────────────── */}
          <div>
            <h3 className="section-title mb-3">{t('triage:fields.chief_complaint')}</h3>
            <textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.currentTarget.value)}
              rows={3}
              className="input resize-y"
              placeholder={t('triage:placeholders.complaint')}
              aria-label={t('triage:fields.chief_complaint')}
            />
          </div>

          {/* ── Acuity selector (5-color radio cards) ────────────────────── */}
          <fieldset>
            <legend className="section-title mb-3">{t('triage:mts_label')}</legend>
            <div
              role="radiogroup"
              aria-label={t('triage:mts_label')}
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
            >
              {MTS_OPTIONS.map((opt) => {
                const active = mts === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setMts(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all',
                      active
                        ? cn(opt.selected, 'shadow-card')
                        : 'border-stone-200 bg-white hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-500',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'h-2 w-full rounded transition-colors',
                        active ? opt.barActive : opt.barIdle,
                      )}
                    />
                    <span
                      className={cn(
                        'flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide',
                        active ? opt.labelActive : 'text-stone-600 dark:text-stone-300',
                      )}
                    >
                      {active && <Icon name="check" size={12} />}
                      {t(opt.i18nKey, { defaultValue: opt.fallbackLabel })}
                    </span>
                    <span className="text-[10px] text-stone-500 dark:text-stone-400">
                      {t(`triage:target.${opt.value}`)}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* ── Notes ────────────────────────────────────────────────────── */}
          <div>
            <h3 className="section-title mb-3">{t('triage:fields.notes')}</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              rows={3}
              className="input resize-y"
              aria-label={t('triage:fields.notes')}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-800/40">
          <Link to="/queue/board/TRI" className="btn-ghost text-sm">
            {t('common:cancel')}
          </Link>
          <button
            type="submit"
            disabled={recordTriage.isPending || mts === null}
            className="btn-primary text-sm"
          >
            <Icon name="arrowRight" size={16} />
            {recordTriage.isPending ? t('triage:submitting') : t('triage:submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

interface VitalCardProps {
  label: string;
  unit?: string;
  outOfRange: boolean;
  warning: string;
  className?: string;
  children: ReactNode;
}

function VitalCard({
  label,
  unit,
  outOfRange,
  warning,
  className,
  children,
}: VitalCardProps): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 shadow-card transition-colors',
        outOfRange
          ? 'border-clinical-triage_red bg-red-50 dark:border-red-700 dark:bg-red-950/30'
          : 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900',
        className,
      )}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <span
          className={cn(
            'flex items-center gap-1 text-xs font-semibold',
            outOfRange
              ? 'text-red-700 dark:text-red-300'
              : 'text-stone-600 dark:text-stone-300',
          )}
        >
          {outOfRange && <Icon name="alertCircle" size={13} className="shrink-0" />}
          {label}
        </span>
        {unit !== undefined && (
          <span className="text-[10px] text-stone-400 dark:text-stone-500">{unit}</span>
        )}
      </div>
      {children}
      {outOfRange && (
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
          {warning}
        </p>
      )}
    </div>
  );
}
