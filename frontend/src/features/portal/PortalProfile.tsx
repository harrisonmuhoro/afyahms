import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@/components/icons/Icon';
import { HttpError } from '@/lib/http';
import { usePortalPatient, useUpdatePortalDemographics } from './api';

function toast(title: string, variant: 'info' | 'success' | 'error' = 'info'): void {
  window.dispatchEvent(new CustomEvent('afya:toast', { detail: { title, variant } }));
}

function errorMessage(err: unknown): string {
  if (err instanceof HttpError) {
    const firstDetail = Object.values(err.details ?? {})[0]?.[0];

    return firstDetail ?? err.message;
  }

  return 'Something went wrong. Please try again.';
}

function StaticRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="py-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
  );
}

export function PortalProfile(): JSX.Element {
  const { patient, isLoading } = usePortalPatient();
  const updateDemographics = useUpdatePortalDemographics();
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: 'unknown',
    marital_status: 'unknown',
    phone: '',
    email: '',
    county: '',
    sub_county: '',
    address: '',
    occupation: '',
    date_of_birth: '',
    national_id: '',
    guardian_name: '',
    guardian_national_id: '',
    guardian_relationship: '',
    current_password: '',
  });

  useEffect(() => {
    if (patient === null) {
      return;
    }

    setForm({
      first_name: patient.first_name ?? '',
      middle_name: patient.middle_name ?? '',
      last_name: patient.last_name ?? '',
      gender: patient.gender ?? 'unknown',
      marital_status: patient.marital_status ?? 'unknown',
      phone: patient.phone ?? '',
      email: patient.email ?? '',
      county: patient.county ?? '',
      sub_county: patient.sub_county ?? '',
      address: patient.address ?? '',
      occupation: patient.occupation ?? '',
      date_of_birth: patient.date_of_birth ?? '',
      national_id: patient.national_id ?? '',
      guardian_name: patient.guardian_name ?? '',
      guardian_national_id: patient.guardian_national_id ?? '',
      guardian_relationship: patient.guardian_relationship ?? '',
      current_password: '',
    });
  }, [patient]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    try {
      const response = await updateDemographics.mutateAsync({
        first_name: form.first_name,
        middle_name: form.middle_name || null,
        last_name: form.last_name,
        gender: form.gender as 'male' | 'female' | 'other' | 'unknown',
        marital_status: form.marital_status || null,
        phone: form.phone || null,
        email: form.email || null,
        county: form.county || null,
        sub_county: form.sub_county || null,
        address: form.address || null,
        occupation: form.occupation || null,
        date_of_birth: form.date_of_birth || null,
        national_id: form.national_id || null,
        guardian_name: form.guardian_name || null,
        guardian_national_id: form.guardian_national_id || null,
        guardian_relationship: form.guardian_relationship || null,
        current_password: form.current_password,
      });
      setEditing(false);
      setLastUpdated(response.data.updated_at ?? new Date().toISOString());
      setForm((current) => ({ ...current, current_password: '' }));
      toast('Profile updated.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  if (isLoading) {
    return <div className="text-sm text-stone-500">Loading profile...</div>;
  }

  if (patient === null) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300">
        No patient record is linked to this account.
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">My Profile</h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Review and update your personal contact details.</p>
          {lastUpdated !== null && <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">Profile updated on {new Date(lastUpdated).toLocaleString()}</p>}
        </div>
        <button type="button" className="btn-secondary" onClick={() => setEditing((current) => !current)}>
          <Icon name={editing ? 'close' : 'user'} size={16} />
          {editing ? 'Cancel' : 'Edit'}
        </button>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Personal Information</h2>
        {!editing ? (
          <dl className="mt-4 grid gap-x-8 divide-y divide-stone-100 dark:divide-stone-800 sm:grid-cols-2 sm:divide-y-0">
            <StaticRow label="Full name" value={patient.full_name} />
            <StaticRow label="Patient number" value={patient.patient_number} />
            <StaticRow label="Phone" value={patient.phone ?? 'Not recorded'} />
            <StaticRow label="Email" value={patient.email ?? 'Not recorded'} />
            <StaticRow label="Address" value={patient.address ?? 'Not recorded'} />
            <StaticRow label="County" value={patient.county ?? 'Not recorded'} />
            <StaticRow label="Sub-county" value={patient.sub_county ?? 'Not recorded'} />
            <StaticRow label="Occupation" value={patient.occupation ?? 'Not recorded'} />
          </dl>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">First name</span>
              <input className="input" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Middle name</span>
              <input className="input" value={form.middle_name} onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Last name</span>
              <input className="input" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Gender</span>
              <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="unknown">Unknown</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Marital status</span>
              <select className="input" value={form.marital_status} onChange={(e) => setForm({ ...form, marital_status: e.target.value })}>
                <option value="unknown">Unknown</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Phone</span>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Email</span>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">County</span>
              <input className="input" value={form.county} onChange={(e) => setForm({ ...form, county: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Sub-county</span>
              <input className="input" value={form.sub_county} onChange={(e) => setForm({ ...form, sub_county: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Date of Birth</span>
              <input type="date" className="input" max={new Date().toISOString().slice(0, 10)} required value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">National ID (Adults)</span>
              <input className="input" value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Guardian Name (Minors)</span>
              <input className="input" value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Guardian National ID</span>
              <input className="input" value={form.guardian_national_id} onChange={(e) => setForm({ ...form, guardian_national_id: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Guardian Relationship</span>
              <input className="input" value={form.guardian_relationship} onChange={(e) => setForm({ ...form, guardian_relationship: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Occupation</span>
              <input className="input" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Address</span>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Current password</span>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} required className="input pr-10" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} autoComplete="current-password" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </label>
            <div className="flex gap-3 sm:col-span-2">
              <button type="submit" className="btn-primary" disabled={updateDemographics.isPending}>
                <Icon name="check" size={16} />
                {updateDemographics.isPending ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">Protected Details</h2>
        <dl className="mt-4 grid gap-x-8 divide-y divide-stone-100 dark:divide-stone-800 sm:grid-cols-2 sm:divide-y-0">
          <StaticRow label="Date of birth" value={patient.date_of_birth ?? 'Contact reception'} />
          <StaticRow label="National ID" value={patient.national_id ?? 'Contact reception'} />
          <StaticRow label="Blood group" value={patient.blood_group ?? 'Not recorded'} />
        </dl>
        <p className="mt-3 text-sm text-stone-500">To update protected identity or clinical details, contact reception.</p>
      </section>
    </div>
  );
}
