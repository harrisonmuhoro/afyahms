import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePatient, usePatientAllergies, useUpdatePatient } from './api';
import { Alert, Avatar, Badge, ErrorState, Skeleton } from '@/components/ui';
import type { Patient, PatientAllergy } from './types';
import { HttpError } from '@/lib/http';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface FormState {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'other' | '';
  date_of_birth: string;
  phone: string;
  email: string;
  national_id: string;
  sha_number: string;
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | '';
  marital_status: string;
  county: string;
  sub_county: string;
  address: string;
  occupation: string;
  guardian_name: string;
  guardian_national_id: string;
  guardian_relationship: string;
}

interface FieldErrors {
  first_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  [key: string]: string | undefined;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const MARITAL_STATUSES = ['single', 'married', 'divorced', 'widowed', 'separated'];
const GENDERS = ['male', 'female', 'other'] as const;

// ────────────────────────────────────────────────────────────
// Page component
// ────────────────────────────────────────────────────────────
export function PatientDetailPage(): JSX.Element {
  const { uuid } = useParams<{ uuid: string }>();
  const { patient, isLoading, error } = usePatient(uuid);
  const update = useUpdatePatient();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('patients.update');
  const { allergies, isLoading: allergiesLoading } = usePatientAllergies(uuid);

  const [form, setForm] = useState<FormState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false); // Default to false until explicitly clicked

  // Populate form when patient data loads
  useEffect(() => {
    if (patient === null) return;
    setForm({
      first_name: patient.first_name ?? '',
      middle_name: patient.middle_name ?? '',
      last_name: patient.last_name ?? '',
      gender: (patient.gender as FormState['gender']) ?? '',
      date_of_birth: patient.date_of_birth
        ? patient.date_of_birth.slice(0, 10)
        : '',
      phone: patient.phone ?? '',
      email: patient.email ?? '',
      national_id: patient.national_id ?? '',
      sha_number: patient.sha_number ?? '',
      blood_group: (patient.blood_group as FormState['blood_group']) ?? '',
      marital_status: patient.marital_status ?? '',
      county: patient.county ?? '',
      sub_county: patient.sub_county ?? '',
      address: patient.address ?? '',
      occupation: patient.occupation ?? '',
      guardian_name: patient.guardian_name ?? '',
      guardian_national_id: patient.guardian_national_id ?? '',
      guardian_relationship: patient.guardian_relationship ?? '',
    });
  }, [patient]);

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((prev) => prev ? { ...prev, [field]: e.target.value } : prev);
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      setSuccessMsg(null);
    };

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!form || !uuid || !patient) return;
    setFieldErrors({});
    setGeneralError(null);
    setSuccessMsg(null);

    const payload: Record<string, unknown> = {};
    let hasChanges = false;

    // Helper to get original value to compare against
    const getOriginal = (key: keyof FormState): string => {
      if (key === 'date_of_birth') {
        return patient.date_of_birth ? patient.date_of_birth.slice(0, 10) : '';
      }
      return (patient[key as keyof typeof patient] as string | null) ?? '';
    };

    const fields = Object.entries(form) as [keyof FormState, string][];
    for (const [key, val] of fields) {
      const trimmed = val.trim();
      const original = getOriginal(key);
      
      // Only include fields that actually changed
      if (trimmed !== original) {
        hasChanges = true;
        if (trimmed !== '') payload[key] = trimmed;
        else payload[key] = null; // allow clearing fields
      }
    }

    if (!hasChanges) {
      setEditing(false);
      return;
    }

    // Backend requires a confirmation_reason when restricted fields change
    if ('date_of_birth' in payload || 'national_id' in payload) {
      payload.confirmation_reason = 'Updated via patient details panel';
    }

    try {
      await update.mutateAsync({ uuid, attributes: payload });
      setSuccessMsg('Patient record updated successfully.');
      setEditing(false);
    } catch (err: unknown) {
      if (err instanceof HttpError) {
        if (err.status === 422 && err.details !== null) {
          const fe: FieldErrors = {};
          for (const [k, v] of Object.entries(err.details as Record<string, string[]>)) {
            fe[k] = Array.isArray(v) ? v[0] : String(v);
          }
          setFieldErrors(fe);
          setGeneralError('Please fix the highlighted fields.');
          return;
        }
        setGeneralError(err.message || 'An error occurred while saving.');
        return;
      }
      setGeneralError('An unexpected error occurred.');
    }
  };

  // ── Loading / error states ────────────────────────────────
  if (error !== null) {
    return (
      <div className="card">
        <ErrorState
          title="Patient record unavailable"
          error={error}
          description="The patient may not exist, or your role may not have access to this record."
        />
        <div className="border-t border-line px-4 py-3 text-center">
          <Link to="/patients" className="text-sm font-medium text-primary hover:underline">Back to patient register</Link>
        </div>
      </div>
    );
  }

  if (!isLoading && patient === null) {
    return (
      <div className="card">
        <ErrorState title="Patient not found" description="No patient matches this link. Search the patient register instead." />
        <div className="border-t border-line px-4 py-3 text-center">
          <Link to="/patients" className="text-sm font-medium text-primary hover:underline">Back to patient register</Link>
        </div>
      </div>
    );
  }

  if (isLoading || form === null || patient === null) {
    return (
      <div role="status" aria-label="Loading patient record" className="space-y-4">
        <div className="card flex items-center gap-4 p-5">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-72" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // ── Page ─────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PatientBanner
        patient={patient}
        allergies={allergies}
        allergiesLoading={allergiesLoading}
        actions={
          canEdit ? (
            editing ? (
              <>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditing(false);
                    setFieldErrors({});
                    setGeneralError(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="patient-edit-form"
                  disabled={update.isPending}
                  className="btn-primary"
                >
                  {update.isPending ? 'Saving…' : 'Save changes'}
                </button>
              </>
            ) : (
              <button
                type="button"
                id="btn-edit-patient"
                className="btn-secondary"
                onClick={() => { setEditing(true); setSuccessMsg(null); setGeneralError(null); }}
              >
                Edit details
              </button>
            )
          ) : null
        }
      />

      {/* Feedback banners */}
      {successMsg !== null && <Alert tone="success">{successMsg}</Alert>}
      {generalError !== null && <Alert tone="danger" title="Changes not saved">{generalError}</Alert>}

      <form id="patient-edit-form" onSubmit={(e) => { void onSubmit(e); }}>
        <div className="grid gap-4 md:grid-cols-2">

          {/* ── Demographics ─────────────────────────────── */}
          <div className="card col-span-full p-4">
            <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Demographics</h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Field label="First Name" required error={fieldErrors.first_name}>
                <input
                  type="text"
                  required
                  disabled={!editing}
                  value={form.first_name}
                  onChange={set('first_name')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
              <Field label="Middle Name" error={fieldErrors.middle_name}>
                <input
                  type="text"
                  disabled={!editing}
                  value={form.middle_name}
                  onChange={set('middle_name')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
              <Field label="Last Name" required error={fieldErrors.last_name}>
                <input
                  type="text"
                  required
                  disabled={!editing}
                  value={form.last_name}
                  onChange={set('last_name')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
              <Field label="Gender" required error={fieldErrors.gender}>
                <select
                  required
                  disabled={!editing}
                  value={form.gender}
                  onChange={set('gender')}
                  className="input disabled:cursor-default disabled:opacity-70"
                >
                  <option value="">— select —</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date of Birth" required error={fieldErrors.date_of_birth}>
                <input
                  type="date"
                  required
                  disabled={!editing}
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.date_of_birth}
                  onChange={set('date_of_birth')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
              <Field label="Blood Group" error={fieldErrors.blood_group}>
                <select
                  disabled={!editing}
                  value={form.blood_group}
                  onChange={set('blood_group')}
                  className="input disabled:cursor-default disabled:opacity-70"
                >
                  <option value="">— unknown —</option>
                  {BLOOD_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </Field>
              <Field label="Marital Status" error={fieldErrors.marital_status}>
                <select
                  disabled={!editing}
                  value={form.marital_status}
                  onChange={set('marital_status')}
                  className="input disabled:cursor-default disabled:opacity-70"
                >
                  <option value="">— unknown —</option>
                  {MARITAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Occupation" error={fieldErrors.occupation}>
                <input
                  type="text"
                  disabled={!editing}
                  value={form.occupation}
                  onChange={set('occupation')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
            </div>
          </div>

          {/* ── Contact ──────────────────────────────────── */}
          <div className="card p-4">
            <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Contact</h2>
            <div className="space-y-3">
              <Field label="Phone" required error={fieldErrors.phone}>
                <input
                  type="tel"
                  required
                  disabled={!editing}
                  placeholder="254712000111"
                  value={form.phone}
                  onChange={set('phone')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
              <Field label="Email" error={fieldErrors.email}>
                <input
                  type="email"
                  disabled={!editing}
                  value={form.email}
                  onChange={set('email')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
              <Field label="County" error={fieldErrors.county}>
                <input
                  type="text"
                  disabled={!editing}
                  value={form.county}
                  onChange={set('county')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
              <Field label="Sub-county" error={fieldErrors.sub_county}>
                <input
                  type="text"
                  disabled={!editing}
                  value={form.sub_county}
                  onChange={set('sub_county')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
              <Field label="Address" error={fieldErrors.address}>
                <textarea
                  rows={2}
                  disabled={!editing}
                  value={form.address}
                  onChange={set('address')}
                  className="input resize-none disabled:cursor-default disabled:opacity-70"
                />
              </Field>
            </div>
          </div>

          {/* ── Identification ───────────────────────────── */}
          <div className="card p-4">
            <h2 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-200">Identification</h2>
            <div className="space-y-3">
              <Field label="National ID" error={fieldErrors.national_id}>
                <input
                  type="text"
                  disabled={!editing}
                  value={form.national_id}
                  onChange={set('national_id')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
              <Field label="SHA Number" error={fieldErrors.sha_number}>
                <input
                  type="text"
                  disabled={!editing}
                  value={form.sha_number}
                  onChange={set('sha_number')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
            </div>

            <h2 className="mb-4 mt-6 text-sm font-semibold text-stone-700 dark:text-stone-200">Guardian</h2>
            <div className="space-y-3">
              <Field label="Guardian Name" error={fieldErrors.guardian_name}>
                <input
                  type="text"
                  disabled={!editing}
                  value={form.guardian_name}
                  onChange={set('guardian_name')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
              <Field label="Guardian National ID" error={fieldErrors.guardian_national_id}>
                <input
                  type="text"
                  disabled={!editing}
                  value={form.guardian_national_id}
                  onChange={set('guardian_national_id')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
              <Field label="Guardian Relationship" error={fieldErrors.guardian_relationship}>
                <input
                  type="text"
                  placeholder="e.g. Mother, Father, Spouse"
                  disabled={!editing}
                  value={form.guardian_relationship}
                  onChange={set('guardian_relationship')}
                  className="input disabled:cursor-default disabled:opacity-70"
                />
              </Field>
            </div>
          </div>

          {/* ── System info (read-only always) ───────────── */}
          <div className="card col-span-full p-4">
            <h2 className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-200">System</h2>
            <dl className="grid gap-2 text-xs sm:grid-cols-3">
              <div>
                <dt className="uppercase text-stone-400">Status</dt>
                <dd className="mt-0.5">
                  <span
                    className={`badge ${
                      patient.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                        : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-400'
                    }`}
                  >
                    {patient.is_active ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="uppercase text-stone-400">Registered</dt>
                <dd className="mt-0.5 text-stone-700 dark:text-stone-300">
                  {patient.created_at
                    ? new Date(patient.created_at).toLocaleDateString('en-KE', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="uppercase text-stone-400">Last Updated</dt>
                <dd className="mt-0.5 text-stone-700 dark:text-stone-300">
                  {patient.updated_at
                    ? new Date(patient.updated_at).toLocaleDateString('en-KE', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })
                    : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Save / Cancel actions — only shown in edit mode */}
        {editing && (
          <div className="mt-4 flex justify-end gap-2 border-t border-stone-200 pt-4 dark:border-stone-800">
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => {
                setEditing(false);
                setFieldErrors({});
                setGeneralError(null);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={update.isPending}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {update.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────
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
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {error !== undefined && error !== '' && (
        <span className="mt-1 text-[11px] font-normal text-red-600 dark:text-red-400">{error}</span>
      )}
    </label>
  );
}

// ────────────────────────────────────────────────────────────
// Patient identity + safety banner
// ────────────────────────────────────────────────────────────
function formatDob(iso: string | null): string | null {
  if (iso === null) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function severityTone(severity: string | null): 'danger' | 'warning' {
  return severity !== null && /severe|life|anaphyl|high/i.test(severity) ? 'danger' : 'warning';
}

interface PatientBannerProps {
  patient: Patient;
  allergies: PatientAllergy[];
  allergiesLoading: boolean;
  actions: React.ReactNode;
}

function PatientBanner({ patient, allergies, allergiesLoading, actions }: PatientBannerProps): JSX.Element {
  const active = allergies.filter((a) => a.is_active);
  const dob = formatDob(patient.date_of_birth);
  const sex = patient.gender !== null ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : null;
  const facts: Array<{ label: string; value: string | null }> = [
    { label: 'Age', value: patient.age !== null ? `${patient.age} yrs` : null },
    { label: 'Sex', value: sex },
    { label: 'Date of birth', value: dob },
    { label: 'Blood group', value: patient.blood_group },
    { label: 'Phone', value: patient.phone },
    { label: 'National ID', value: patient.national_id },
    { label: 'SHA number', value: patient.sha_number },
  ];

  return (
    <section aria-label="Patient summary" className="card overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <Avatar name={patient.full_name} src={patient.photo_path} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-ink">{patient.full_name}</h1>
            {patient.deceased ? (
              <Badge tone="neutral" dot>Deceased</Badge>
            ) : !patient.is_active ? (
              <Badge tone="warning" dot>Inactive record</Badge>
            ) : null}
            {patient.merged_into !== null && <Badge tone="info">Merged record</Badge>}
          </div>
          <p className="mt-0.5 font-mono text-[13px] text-ink-secondary">{patient.patient_number}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">{fact.label}</dt>
                <dd className="truncate text-sm text-ink">{fact.value ?? <span className="text-ink-muted">Not recorded</span>}</dd>
              </div>
            ))}
          </dl>
        </div>
        {actions !== null && <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{actions}</div>}
      </div>

      <div
        className={
          active.length > 0
            ? 'border-t border-danger/25 bg-danger-soft px-5 py-3'
            : 'border-t border-line bg-surface-muted px-5 py-3'
        }
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={`text-xs font-semibold uppercase tracking-wide ${active.length > 0 ? 'text-danger' : 'text-ink-muted'}`}>
            Allergies
          </span>
          {allergiesLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : active.length === 0 ? (
            <span className="text-sm text-ink-secondary">No known allergies recorded</span>
          ) : (
            active.map((allergy) => (
              <Badge key={allergy.id} tone={severityTone(allergy.severity)} dot>
                <span className="font-semibold">{allergy.allergen}</span>
                {allergy.reaction !== null && <span className="font-normal">— {allergy.reaction}</span>}
                {allergy.severity !== null && <span className="font-normal opacity-80">({allergy.severity})</span>}
              </Badge>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
