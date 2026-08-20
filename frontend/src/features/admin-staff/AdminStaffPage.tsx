import { useEffect, useState, type FormEvent } from 'react';
import { Icon } from '@/components/icons/Icon';
import { HttpError } from '@/lib/http';
import { useAuth, type AuthUser } from '@/features/auth/AuthProvider';
import { useBranches, type Branch } from '@/features/branches/BranchProvider';
import {
  useAdminStaff,
  useCreateAdminUser,
  useCreateStaff,
  useSetStaffActiveState,
  useTriggerPasswordReset,
  useUpdateStaffBranches,
  useUpdateStaffEmployment,
  useUpdateStaffRole,
} from './api';

const STAFF_ROLES = [
  'doctor',
  'nurse',
  'receptionist',
  'records-officer',
  'pharmacist',
  'lab-technician',
  'radiologist',
  'cashier',
];

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

function roleLabel(role: string): string {
  return role.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/* ── Create Staff Modal ─────────────────────────────────────────────────────── */
interface CreateStaffModalProps {
  branches: Branch[];
  onClose: () => void;
  onCreated: (user: AuthUser) => void;
}

function CreateStaffModal({ branches, onClose, onCreated }: CreateStaffModalProps): JSX.Element {
  const createStaff = useCreateStaff();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'doctor',
    home_branch_id: branches[0]?.id ?? 0,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const response = await createStaff.mutateAsync({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        home_branch_id: Number(form.home_branch_id),
      });
      toast(response.message, 'success');
      onCreated(response.user);
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-fade-in rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Add New Staff Member</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800">
            <Icon name="close" size={20} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Full Name <span className="text-red-500">*</span></span>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dr. Jane Mwangi" />
            </label>
            <label className="block">
              <span className="label">Work Email <span className="text-red-500">*</span></span>
              <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@hospital.com" />
            </label>
            <label className="block">
              <span className="label">Phone (optional)</span>
              <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 7XX XXX XXX" />
            </label>
            <label className="block">
              <span className="label">Role <span className="text-red-500">*</span></span>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {STAFF_ROLES.map((r) => (
                  <option key={r} value={r}>{roleLabel(r)}</option>
                ))}
              </select>
            </label>
            <label className="col-span-full block">
              <span className="label">Home Branch <span className="text-red-500">*</span></span>
              <select className="input" value={form.home_branch_id} onChange={(e) => setForm({ ...form, home_branch_id: Number(e.target.value) })}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300">
            <Icon name="alertCircle" size={14} className="mr-1.5 inline" />
            A temporary password will be shown after creation. Please share it securely with the new staff member.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={createStaff.isPending}>
              {createStaff.isPending ? 'Creating...' : 'Create Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Create Admin / Superadmin Modal ───────────────────────────────────────── */
interface CreateAdminModalProps {
  onClose: () => void;
  onCreated: (user: AuthUser) => void;
}

function CreateAdminModal({ onClose, onCreated }: CreateAdminModalProps): JSX.Element {
  const createAdmin = useCreateAdminUser();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'hospital-admin' as 'hospital-admin' | 'superadmin',
    password: '',
    password_confirmation: '',
  });
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.password_confirmation) {
      toast('Passwords do not match.', 'error');
      return;
    }
    try {
      const response = await createAdmin.mutateAsync({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        roles: [form.role],
        password: form.password,
      });
      toast(`Account created for ${response.user.name}.`, 'success');
      onCreated(response.user);
      onClose();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg animate-fade-in rounded-2xl border border-red-200 bg-white p-6 shadow-xl dark:border-red-900/40 dark:bg-stone-900">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Create Admin Account</h2>
            <p className="mt-0.5 text-xs text-stone-500">Only visible and accessible by Superadmin.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
          <Icon name="alertCircle" size={14} className="mr-1.5 inline" />
          This account will have elevated system access. Only create accounts for trusted personnel.
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Full Name <span className="text-red-500">*</span></span>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jane Doe" />
            </label>
            <label className="block">
              <span className="label">Email <span className="text-red-500">*</span></span>
              <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@hospital.com" />
            </label>
            <label className="block">
              <span className="label">Phone (optional)</span>
              <input type="tel" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 7XX XXX XXX" />
            </label>
            <label className="block">
              <span className="label">Role <span className="text-red-500">*</span></span>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'hospital-admin' | 'superadmin' })}>
                <option value="hospital-admin">Hospital Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Password <span className="text-red-500">*</span></span>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="input pr-10"
                  required
                  minLength={10}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 10 characters"
                  autoComplete="new-password"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600" onClick={() => setShowPass(!showPass)}>
                  <Icon name={showPass ? 'eye' : 'eyeOff'} size={16} />
                </button>
              </div>
            </label>
            <label className="block">
              <span className="label">Confirm Password <span className="text-red-500">*</span></span>
              <input
                type={showPass ? 'text' : 'password'}
                className="input"
                required
                value={form.password_confirmation}
                onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              disabled={createAdmin.isPending}
            >
              {createAdmin.isPending ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Branch Management Section ─────────────────────────────────────────────── */
interface BranchManagementProps {
  staff: AuthUser;
  allBranches: Branch[];
  onUpdate: (user: AuthUser) => void;
}

function BranchManagementSection({ staff, allBranches, onUpdate }: BranchManagementProps): JSX.Element {
  const updateBranches = useUpdateStaffBranches();

  // Get current branch IDs from staff branches array
  const staffBranchIds = (staff.branches ?? []).map((b) => b.id);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>(staffBranchIds);
  const [homeBranchId, setHomeBranchId] = useState<number>(
    staff.home_branch_id ?? staffBranchIds[0] ?? allBranches[0]?.id ?? 0
  );

  useEffect(() => {
    const ids = (staff.branches ?? []).map((b) => b.id);
    setSelectedBranchIds(ids);
    setHomeBranchId(staff.home_branch_id ?? ids[0] ?? allBranches[0]?.id ?? 0);
  }, [staff, allBranches]);

  const toggleBranch = (id: number) => {
    setSelectedBranchIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // If home branch is deselected, switch home to first remaining
      if (!next.includes(homeBranchId) && next.length > 0) {
        setHomeBranchId(next[0]);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedBranchIds.length === 0) {
      toast('At least one branch must be selected.', 'error');
      return;
    }
    try {
      const response = await updateBranches.mutateAsync({
        id: staff.id,
        payload: { branch_ids: selectedBranchIds, home_branch_id: homeBranchId },
      });
      onUpdate(response.user);
      toast(response.message, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Branch Access</h2>
        <button type="button" className="btn-primary py-1.5 text-sm" onClick={() => void handleSave()} disabled={updateBranches.isPending}>
          {updateBranches.isPending ? 'Saving...' : 'Save branches'}
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-500">Select all branches this staff member works at, and mark one as their home branch.</p>

      <div className="mt-4 space-y-2">
        {allBranches.map((branch) => {
          const isSelected = selectedBranchIds.includes(branch.id);
          const isHome = homeBranchId === branch.id;
          return (
            <div
              key={branch.id}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                isSelected
                  ? 'border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-950/30'
                  : 'border-stone-200 dark:border-stone-700'
              }`}
            >
              <input
                id={`branch-${branch.id}`}
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                checked={isSelected}
                onChange={() => toggleBranch(branch.id)}
              />
              <label htmlFor={`branch-${branch.id}`} className="flex-1 cursor-pointer">
                <span className="block text-sm font-medium text-stone-800 dark:text-stone-200">{branch.name}</span>
                {branch.address && <span className="text-xs text-stone-500">{branch.address}</span>}
              </label>
              {isSelected && (
                <button
                  type="button"
                  onClick={() => { if (isSelected) setHomeBranchId(branch.id); }}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    isHome
                      ? 'bg-teal-600 text-white'
                      : 'bg-stone-100 text-stone-500 hover:bg-teal-100 hover:text-teal-700 dark:bg-stone-700 dark:text-stone-400'
                  }`}
                >
                  {isHome ? '★ Home' : 'Set home'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────────── */
export function AdminStaffPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const { staff, isLoading } = useAdminStaff(search);
  const { branches } = useBranches();
  const { user } = useAuth();
  const isSuperadmin = user?.roles.includes('superadmin') ?? false;
  const [selected, setSelected] = useState<AuthUser | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const updateEmployment = useUpdateStaffEmployment();
  const updateRole = useUpdateStaffRole();
  const passwordReset = useTriggerPasswordReset();
  const activeState = useSetStaffActiveState();
  const [employmentForm, setEmploymentForm] = useState({
    name: '',
    national_id: '',
    date_of_birth: '',
    staff_id: '',
    department: '',
    specialization: '',
    license_number: '',
    employment_type: '',
    employment_start_date: '',
  });
  const [roleForm, setRoleForm] = useState({ role: 'doctor', reason: '' });
  const [statusReason, setStatusReason] = useState('');

  useEffect(() => {
    if (selected === null && staff.length > 0) {
      setSelected(staff[0]);
    }
  }, [selected, staff]);

  useEffect(() => {
    if (selected === null) {
      return;
    }

    setEmploymentForm({
      name: selected.name ?? '',
      national_id: selected.national_id ?? '',
      date_of_birth: selected.date_of_birth ?? '',
      staff_id: selected.staff_id ?? '',
      department: selected.department ?? '',
      specialization: selected.specialization ?? '',
      license_number: selected.license_number ?? '',
      employment_type: selected.employment_type ?? '',
      employment_start_date: selected.employment_start_date ?? '',
    });
    setRoleForm({ role: selected.roles.find((role) => STAFF_ROLES.includes(role)) ?? 'doctor', reason: '' });
    setStatusReason('');
  }, [selected]);

  const handleEmploymentSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (selected === null) return;
    try {
      const response = await updateEmployment.mutateAsync({
        id: selected.id,
        payload: {
          name: employmentForm.name,
          national_id: employmentForm.national_id || null,
          date_of_birth: employmentForm.date_of_birth || null,
          staff_id: employmentForm.staff_id || null,
          department: employmentForm.department || null,
          specialization: employmentForm.specialization || null,
          license_number: employmentForm.license_number || null,
          employment_type: employmentForm.employment_type || null,
          employment_start_date: employmentForm.employment_start_date || null,
        },
      });
      setSelected(response.user);
      toast('Employment profile updated.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const handleRoleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (selected === null) return;
    try {
      const response = await updateRole.mutateAsync({ id: selected.id, payload: roleForm });
      setSelected(response.user);
      setRoleForm((current) => ({ ...current, reason: '' }));
      toast(response.message, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const handlePasswordReset = async (): Promise<void> => {
    if (selected === null) return;
    try {
      const response = await passwordReset.mutateAsync(selected.id);
      toast(response.message, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const handleActiveState = async (active: boolean): Promise<void> => {
    if (selected === null) return;
    try {
      const response = await activeState.mutateAsync({ id: selected.id, active, reason: statusReason });
      setSelected(response.user);
      setStatusReason('');
      toast(response.message, 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {showCreateModal && branches.length > 0 && (
        <CreateStaffModal
          branches={branches}
          onClose={() => setShowCreateModal(false)}
          onCreated={(user) => setSelected(user)}
        />
      )}
      {showCreateAdminModal && (
        <CreateAdminModal
          onClose={() => setShowCreateAdminModal(false)}
          onCreated={(user) => setSelected(user)}
        />
      )}

      <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 dark:border-stone-800 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-title">Staff Management</h1>
          <p className="mt-1 text-sm text-stone-500">Manage staff employment data, roles, branch assignments, and account status.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block w-full sm:w-72">
            <span className="label">Search staff</span>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, staff ID, department" />
          </label>
          {isSuperadmin && (
            <button
              type="button"
              className="shrink-0 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
              onClick={() => setShowCreateAdminModal(true)}
            >
              <Icon name="shield" size={16} />
              Add Admin Account
            </button>
          )}
          <button
            type="button"
            className="btn-primary shrink-0"
            onClick={() => setShowCreateModal(true)}
          >
            <Icon name="plus" size={16} />
            Add Staff
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Staff list */}
        <section className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          {isLoading && <p className="p-3 text-sm text-stone-500">Loading staff...</p>}
          {!isLoading && staff.length === 0 && <p className="p-3 text-sm text-stone-500">No staff found.</p>}
          <div className="space-y-2">
            {staff.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelected(member)}
                className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                  selected?.id === member.id
                    ? 'border-brand-500 bg-brand-50 text-brand-900 dark:border-brand-400 dark:bg-brand-950/30 dark:text-brand-100'
                    : 'border-stone-200 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800'
                }`}
              >
                <span className="block text-sm font-semibold">{member.name}</span>
                <span className="mt-1 block text-xs text-stone-500">{member.roles.map(roleLabel).join(', ') || 'No role'}</span>
                <span className="mt-1 block text-xs text-stone-400">
                  {(member.branches ?? []).length > 0
                    ? (member.branches as Branch[]).map((b) => b.name).join(', ')
                    : member.staff_id ?? member.email}
                </span>
              </button>
            ))}
          </div>
        </section>

        {selected !== null && (
          <div className="space-y-6">
            {/* Header */}
            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">{selected.name}</h2>
                  <p className="mt-1 text-sm text-stone-500">{selected.email}</p>
                </div>
                <span className={`chip ${selected.is_active ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                  {selected.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Employment form */}
              <form onSubmit={(e) => void handleEmploymentSubmit(e)} className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="label">Full name</span>
                  <input className="input" value={employmentForm.name} onChange={(e) => setEmploymentForm({ ...employmentForm, name: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">Staff ID</span>
                  <input className="input" value={employmentForm.staff_id} onChange={(e) => setEmploymentForm({ ...employmentForm, staff_id: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">National ID</span>
                  <input className="input" value={employmentForm.national_id} onChange={(e) => setEmploymentForm({ ...employmentForm, national_id: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">Date of birth</span>
                  <input type="date" className="input" max={new Date().toISOString().slice(0, 10)} value={employmentForm.date_of_birth} onChange={(e) => setEmploymentForm({ ...employmentForm, date_of_birth: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">Department</span>
                  <input className="input" value={employmentForm.department} onChange={(e) => setEmploymentForm({ ...employmentForm, department: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">Specialization</span>
                  <input className="input" value={employmentForm.specialization} onChange={(e) => setEmploymentForm({ ...employmentForm, specialization: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">License number</span>
                  <input className="input" value={employmentForm.license_number} onChange={(e) => setEmploymentForm({ ...employmentForm, license_number: e.target.value })} />
                </label>
                <label className="block">
                  <span className="label">Employment type</span>
                  <select className="input" value={employmentForm.employment_type} onChange={(e) => setEmploymentForm({ ...employmentForm, employment_type: e.target.value })}>
                    <option value="">Not recorded</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="locum">Locum</option>
                    <option value="contract">Contract</option>
                  </select>
                </label>
                <label className="block">
                  <span className="label">Employment start date</span>
                  <input type="date" className="input" value={employmentForm.employment_start_date} onChange={(e) => setEmploymentForm({ ...employmentForm, employment_start_date: e.target.value })} />
                </label>
                <div className="flex items-end">
                  <button type="submit" className="btn-primary" disabled={updateEmployment.isPending}>
                    <Icon name="check" size={16} />
                    {updateEmployment.isPending ? 'Saving...' : 'Save employment'}
                  </button>
                </div>
              </form>
            </section>

            {/* Branch Management */}
            <BranchManagementSection
              staff={selected}
              allBranches={branches}
              onUpdate={(u) => setSelected(u)}
            />

            {/* Role & Account Actions */}
            <section className="grid gap-6 md:grid-cols-2">
              <form onSubmit={(e) => void handleRoleSubmit(e)} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Role Assignment</h2>
                <div className="mt-4 space-y-3">
                  <select className="input" value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}>
                    {STAFF_ROLES.map((role) => (
                      <option key={role} value={role}>{roleLabel(role)}</option>
                    ))}
                  </select>
                  <textarea className="input min-h-24" required value={roleForm.reason} onChange={(e) => setRoleForm({ ...roleForm, reason: e.target.value })} placeholder="Reason for role change" />
                  <button type="submit" className="btn-secondary" disabled={updateRole.isPending}>
                    <Icon name="users" size={16} />
                    {updateRole.isPending ? 'Updating...' : 'Update role'}
                  </button>
                </div>
              </form>

              <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Account Actions</h2>
                <div className="mt-4 space-y-3">
                  <button type="button" className="btn-secondary" onClick={() => void handlePasswordReset()} disabled={passwordReset.isPending}>
                    <Icon name="mail" size={16} />
                    {passwordReset.isPending ? 'Sending...' : 'Send password reset'}
                  </button>
                  <textarea className="input min-h-24" value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="Reason for activation/deactivation" />
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className="btn-danger" onClick={() => void handleActiveState(false)} disabled={activeState.isPending || !selected.is_active}>
                      Deactivate
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => void handleActiveState(true)} disabled={activeState.isPending || selected.is_active}>
                      Reactivate
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
