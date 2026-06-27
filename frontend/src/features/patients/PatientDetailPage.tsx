import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { usePatient } from './api';

export function PatientDetailPage(): JSX.Element {
  const { t } = useTranslation(['patients', 'common', 'errors']);
  const { uuid } = useParams<{ uuid: string }>();
  const { patient, isLoading, error } = usePatient(uuid);

  if (isLoading) {
    return <p className="text-sm text-stone-500">{t('common:loading')}</p>;
  }

  if (error !== null) {
    return (
      <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-clinical-critical dark:bg-red-950/40">
        {t('errors:not_found')}
      </div>
    );
  }

  if (patient === null) {
    return (
      <p className="text-sm text-stone-500">{t('patients:detail.not_found')}</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            {patient.full_name}
          </h1>
          <p className="font-mono text-xs text-stone-500">
            {patient.patient_number}
          </p>
        </div>
        <Link to="/patients" className="btn-ghost text-xs">
          ← {t('common:back')}
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={t('patients:detail.demographics')}>
          <Field label={t('patients:fields.gender')}>
            {patient.gender === null ? '—' : t(`patients:gender.${patient.gender}`)}
          </Field>
          <Field label={t('patients:fields.date_of_birth')}>{patient.date_of_birth ?? '—'}</Field>
          <Field label={t('patients:fields.age')}>{patient.age ?? '—'}</Field>
          <Field label={t('patients:fields.blood_group')}>{patient.blood_group ?? '—'}</Field>
          <Field label={t('patients:fields.marital_status')}>{patient.marital_status ?? '—'}</Field>
        </Section>

        <Section title={t('patients:detail.contact')}>
          <Field label={t('patients:fields.phone')}>{patient.phone ?? '—'}</Field>
          <Field label={t('patients:fields.email')}>{patient.email ?? '—'}</Field>
          <Field label={t('patients:fields.county')}>{patient.county ?? '—'}</Field>
          <Field label={t('patients:fields.sub_county')}>{patient.sub_county ?? '—'}</Field>
          <Field label={t('patients:fields.address')}>{patient.address ?? '—'}</Field>
        </Section>

        <Section title={t('patients:detail.identification')}>
          <Field label={t('patients:fields.national_id')}>{patient.national_id ?? '—'}</Field>
          <Field label={t('patients:fields.sha_number')}>{patient.sha_number ?? '—'}</Field>
        </Section>

        <Section title={t('patients:detail.system')}>
          <Field label={t('common:status')}>
            <span className={`badge ${patient.is_active ? 'bg-brand-100 text-brand-800' : 'bg-stone-200 text-stone-600'}`}>
              {patient.is_active ? t('patients:badges.active') : t('patients:badges.inactive')}
            </span>
          </Field>
          <Field label={t('patients:fields.created_at')}>{patient.created_at ?? '—'}</Field>
          <Field label={t('patients:fields.updated_at')}>{patient.updated_at ?? '—'}</Field>
        </Section>
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps): JSX.Element {
  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">{title}</h2>
      <dl className="mt-3 space-y-2 text-sm">{children}</dl>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
}

function Field({ label, children }: FieldProps): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-stone-100 pb-1 last:border-b-0 dark:border-stone-800">
      <dt className="text-xs uppercase text-stone-500">{label}</dt>
      <dd className="text-right text-sm text-stone-800 dark:text-stone-200">{children}</dd>
    </div>
  );
}
