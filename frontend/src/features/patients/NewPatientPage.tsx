import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { httpClient, HttpError } from '@/lib/http';
import type { Patient } from './types';

type DuplicateCandidate = {
  public_id: string;
  patient_number: string;
  full_name: string;
  score: number;
  tier: string;
  signals: string[];
};

interface RegisterResponse {
  data: Patient;
}

interface ConflictDetails {
  code?: string;
  candidates?: DuplicateCandidate[];
}

interface FormState {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'other';
  date_of_birth: string;
  phone: string;
  email: string;
  national_id: string;
  sha_number: string;
  blood_group: '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  county: string;
  address: string;
}

const INITIAL: FormState = {
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: 'male',
  date_of_birth: '',
  phone: '',
  email: '',
  national_id: '',
  sha_number: '',
  blood_group: '',
  county: '',
  address: '',
};

interface FieldErrors {
  first_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  national_id?: string;
  sha_number?: string;
  blood_group?: string;
  county?: string;
  address?: string;
  middle_name?: string;
}

function asFieldErrors(details: unknown): FieldErrors {
  if (details === null || typeof details !== 'object') {
    return {};
  }
  return details as FieldErrors;
}

export function NewPatientPage(): JSX.Element {
  const { t } = useTranslation(['patients', 'common', 'errors']);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [createdNumber, setCreatedNumber] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (payload: FormState & { dedupe_override?: boolean }) => {
      return await httpClient.post<RegisterResponse>('/patients', payload);
    },
    onSuccess: (response) => {
      setCreatedNumber(response.data.patient_number);
      setFieldErrors({});
      setGeneralError(null);
      setDuplicates([]);
    },
    onError: (err: unknown) => {
      if (!(err instanceof HttpError)) {
        setGeneralError(t('errors:generic'));
        return;
      }
      if (err.status === 422) {
        setFieldErrors(asFieldErrors(err.details));
        setGeneralError(t('errors:validation'));
        return;
      }
      if (err.status === 409) {
        const details = (err.details ?? null) as ConflictDetails | null;
        const candidates = details?.candidates ?? [];
        setDuplicates(candidates);
        setGeneralError(t('patients:new.duplicate_body'));
        return;
      }
      setGeneralError(err.message || t('errors:generic'));
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setDuplicates([]);

    const payload: Record<string, unknown> = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      gender: form.gender,
      date_of_birth: form.date_of_birth,
      phone: form.phone.trim(),
    };
    if (form.middle_name.trim() !== '') {
      payload.middle_name = form.middle_name.trim();
    }
    if (form.email.trim() !== '') {
      payload.email = form.email.trim();
    }
    if (form.national_id.trim() !== '') {
      payload.national_id = form.national_id.trim();
    }
    if (form.sha_number.trim() !== '') {
      payload.sha_number = form.sha_number.trim();
    }
    if (form.blood_group !== '') {
      payload.blood_group = form.blood_group;
    }
    if (form.county.trim() !== '') {
      payload.county = form.county.trim();
    }
    if (form.address.trim() !== '') {
      payload.address = form.address.trim();
    }

    mutation.mutate(payload as unknown as FormState);
  };

  const onOverride = (): void => {
    setFieldErrors({});
    setGeneralError(null);
    setDuplicates([]);

    const payload: Record<string, unknown> = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      gender: form.gender,
      date_of_birth: form.date_of_birth,
      phone: form.phone.trim(),
      dedupe_override: true,
    };
    if (form.middle_name.trim() !== '') {
      payload.middle_name = form.middle_name.trim();
    }
    if (form.email.trim() !== '') {
      payload.email = form.email.trim();
    }
    if (form.national_id.trim() !== '') {
      payload.national_id = form.national_id.trim();
    }
    if (form.sha_number.trim() !== '') {
      payload.sha_number = form.sha_number.trim();
    }
    if (form.blood_group !== '') {
      payload.blood_group = form.blood_group;
    }
    if (form.county.trim() !== '') {
      payload.county = form.county.trim();
    }
    if (form.address.trim() !== '') {
      payload.address = form.address.trim();
    }

    mutation.mutate(payload as unknown as FormState);
  };

  const isSubmitting = mutation.isPending;

  if (createdNumber !== null) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="card p-6 text-center">
          <h1 className="text-lg font-semibold text-brand-800 dark:text-brand-200">
            {t('patients:new.success')}
          </h1>
          <p className="mt-2 font-mono text-sm">{createdNumber}</p>
        </div>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => navigate(`/patients`)}
          >
            {t('patients:title')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
            {t('patients:new.title')}
          </h1>
          <p className="text-xs text-stone-500">{t('patients:new.subtitle')}</p>
        </div>
        <Link to="/patients" className="btn-ghost text-xs">
          ← {t('common:back')}
        </Link>
      </div>

      {generalError !== null && (
        <div role="alert" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {generalError}
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40">
          <p className="font-semibold text-amber-900 dark:text-amber-100">
            {t('patients:new.duplicate_title')}
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {duplicates.map((d) => (
              <li key={d.public_id} className="font-mono">
                <Link to={`/patients/${d.public_id}`} className="text-brand-700 underline dark:text-brand-300">
                  {d.patient_number}
                </Link>{' '}
                — {d.full_name} · {d.tier} ({d.signals.join(', ')})
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onOverride}
            disabled={isSubmitting}
            className="btn-secondary mt-3 text-xs"
          >
            {t('patients:new.duplicate_override')}
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="card space-y-4 p-4">
        <p className="text-xs text-stone-500">{t('patients:new.required_hint')}</p>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t('patients:fields.first_name')} required error={fieldErrors.first_name}>
            <input
              type="text"
              required
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.currentTarget.value })}
              className="input"
            />
          </Field>
          <Field label={t('patients:fields.middle_name')} error={fieldErrors.middle_name}>
            <input
              type="text"
              value={form.middle_name}
              onChange={(e) => setForm({ ...form, middle_name: e.currentTarget.value })}
              className="input"
            />
          </Field>
          <Field label={t('patients:fields.last_name')} required error={fieldErrors.last_name}>
            <input
              type="text"
              required
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.currentTarget.value })}
              className="input"
            />
          </Field>
          <Field label={t('patients:fields.gender')} required error={fieldErrors.gender}>
            <select
              required
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.currentTarget.value as FormState['gender'] })}
              className="input"
            >
              <option value="male">{t('patients:gender.male')}</option>
              <option value="female">{t('patients:gender.female')}</option>
              <option value="other">{t('patients:gender.other')}</option>
            </select>
          </Field>
          <Field label={t('patients:fields.date_of_birth')} required error={fieldErrors.date_of_birth}>
            <input
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.currentTarget.value })}
              className="input"
            />
          </Field>
          <Field label={t('patients:fields.phone')} required error={fieldErrors.phone}>
            <input
              type="tel"
              required
              placeholder="254712000111"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.currentTarget.value })}
              className="input"
            />
          </Field>
          <Field label={t('patients:fields.email')} error={fieldErrors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.currentTarget.value })}
              className="input"
            />
          </Field>
          <Field label={t('patients:fields.blood_group')} error={fieldErrors.blood_group}>
            <select
              value={form.blood_group}
              onChange={(e) => setForm({ ...form, blood_group: e.currentTarget.value as FormState['blood_group'] })}
              className="input"
            >
              <option value="">{t('common:none')}</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>
          <Field label={t('patients:fields.national_id')} error={fieldErrors.national_id}>
            <input
              type="text"
              value={form.national_id}
              onChange={(e) => setForm({ ...form, national_id: e.currentTarget.value })}
              className="input"
            />
          </Field>
          <Field label={t('patients:fields.sha_number')} error={fieldErrors.sha_number}>
            <input
              type="text"
              value={form.sha_number}
              onChange={(e) => setForm({ ...form, sha_number: e.currentTarget.value })}
              className="input"
            />
          </Field>
          <Field label={t('patients:fields.county')} error={fieldErrors.county}>
            <input
              type="text"
              value={form.county}
              onChange={(e) => setForm({ ...form, county: e.currentTarget.value })}
              className="input"
            />
          </Field>
          <Field label={t('patients:fields.address')} error={fieldErrors.address}>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.currentTarget.value })}
              className="input"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-200 pt-3 dark:border-stone-800">
          <Link to="/patients" className="btn-ghost text-sm">
            {t('common:cancel')}
          </Link>
          <button type="submit" disabled={isSubmitting} className="btn-primary text-sm disabled:opacity-50">
            {isSubmitting ? t('patients:new.submitting') : t('patients:new.submit')}
          </button>
        </div>
      </form>
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required = false, error, children }: FieldProps): JSX.Element {
  return (
    <label className="flex flex-col text-xs font-medium text-stone-600 dark:text-stone-300">
      <span className="mb-1">
        {label}
        {required && <span className="ml-0.5 text-clinical-critical">*</span>}
      </span>
      {children}
      {error !== undefined && error !== '' && (
        <span className="mt-1 text-[11px] font-normal text-clinical-critical">{error}</span>
      )}
    </label>
  );
}
