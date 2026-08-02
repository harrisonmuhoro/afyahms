import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBranches } from '@/features/branches/BranchProvider';
import { useAdminStaff } from '@/features/admin-staff/api';
import { useAuditLog } from '@/features/audit/api';
import { Icon, type IconName } from '@/components/icons/Icon';
import { cn } from '@/lib/cn';
import type { AuthUser } from '@/features/auth/AuthProvider';

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/* Security-relevant audit events get a critical tint; the rest render neutral. */
const SECURITY_EVENTS = ['login_failed', 'mfa_failed', 'permission_denied', 'password_reset', 'account_locked'];

interface KpiProps {
  label: string;
  value: string;
  icon: IconName;
  tone?: 'default' | 'critical';
}

function KpiCard({ label, value, icon, tone = 'default' }: KpiProps): JSX.Element {
  return (
    <div
      className={cn(
        'stat-card p-4',
        tone === 'critical' &&
          'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30',
      )}
    >
      <div className="flex items-start justify-between">
        <span className="section-title">{label}</span>
        <Icon
          name={icon}
          size={18}
          className={tone === 'critical' ? 'text-clinical-critical' : 'text-brand-600 dark:text-brand-400'}
        />
      </div>
      <span className="mt-1 text-3xl font-bold text-stone-900 dark:text-stone-50">{value}</span>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        active
          ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
          : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
      )}
    >
      <Icon name={active ? 'check' : 'close'} size={10} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function UserRow({ member }: { member: AuthUser }): JSX.Element {
  return (
    <tr className="border-b border-stone-100 transition-colors hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="avatar-sm shrink-0">{initials(member.name)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">{member.name}</p>
            <p className="truncate text-xs text-stone-500">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {member.roles.slice(0, 2).map((role) => (
            <span key={role} className="chip capitalize">
              {role.replace(/-/g, ' ')}
            </span>
          ))}
        </div>
      </td>
      <td className="hidden px-4 py-3 text-sm text-stone-600 dark:text-stone-300 md:table-cell">
        {member.home_branch?.name ?? '—'}
      </td>
      <td className="px-4 py-3">
        <StatusPill active={member.is_active} />
      </td>
      <td className="hidden px-4 py-3 lg:table-cell">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium',
            member.mfa_enabled
              ? 'text-green-700 dark:text-green-400'
              : 'text-clinical-warning',
          )}
        >
          <Icon name={member.mfa_enabled ? 'shield' : 'alertCircle'} size={12} />
          {member.mfa_enabled ? 'MFA on' : 'MFA off'}
        </span>
      </td>
      <td className="hidden px-4 py-3 font-mono text-xs text-stone-500 lg:table-cell">
        {member.last_seen_at !== null ? timeAgo(member.last_seen_at) : '—'}
      </td>
    </tr>
  );
}

/**
 * Superadmin role dashboard (design.md SCREEN 2): system-wide KPI row, branch
 * grid, recent security events (audit log) and a user management table.
 * Rendered from DashboardPage when the signed-in user has the superadmin role.
 */
export function SuperadminDashboard(): JSX.Element {
  const { user } = useAuth();
  const { branches, isLoading: branchesLoading } = useBranches();
  const [search, setSearch] = useState('');
  const { staff, isLoading: staffLoading } = useAdminStaff(search);
  const { data: auditEntries, isLoading: auditLoading, error: auditError } = useAuditLog({ perPage: 8 });

  const activeStaff = useMemo(() => staff.filter((s) => s.is_active), [staff]);
  const mfaOff = useMemo(() => staff.filter((s) => s.is_active && !s.mfa_enabled), [staff]);
  const securityEvents = useMemo(
    () => auditEntries.filter((e) => SECURITY_EVENTS.some((s) => e.event.includes(s))),
    [auditEntries],
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 animate-fade-in">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
          System administration
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Global oversight across {branches.length > 0 ? `${branches.length} branches` : 'all branches'}
          {user !== null ? ` — signed in as ${user.name}` : ''}
        </p>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active staff" value={staffLoading ? '…' : String(activeStaff.length)} icon="users" />
        <KpiCard label="Branches" value={branchesLoading ? '…' : String(branches.length)} icon="branches" />
        <KpiCard
          label="Staff without MFA"
          value={staffLoading ? '…' : String(mfaOff.length)}
          icon="shield"
          tone={mfaOff.length > 0 ? 'critical' : 'default'}
        />
        <KpiCard
          label="Security events"
          value={auditLoading ? '…' : String(securityEvents.length)}
          icon="audit"
          tone={securityEvents.length > 0 ? 'critical' : 'default'}
        />
      </section>

      {/* ── Branch grid ─────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-title">Branch overview</h2>
          <Link
            to="/branches"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
          >
            Manage branches
            <Icon name="arrowRight" size={12} />
          </Link>
        </div>
        {branches.length === 0 ? (
          <div className="card p-8 text-center">
            <Icon name="branches" size={32} className="mx-auto text-stone-300 dark:text-stone-600" />
            <p className="mt-2 text-sm font-medium text-stone-500">No branches configured yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <div key={branch.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {branch.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      <span className="font-mono">{branch.code}</span>
                      {branch.address !== null ? ` · ${branch.address}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                      branch.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                        : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        branch.is_active ? 'bg-green-500' : 'bg-stone-400',
                      )}
                      aria-hidden
                    />
                    {branch.is_active ? 'Open' : 'Closed'}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-stone-500">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="time" size={12} />
                    {branch.timezone}
                  </span>
                  <span className="font-mono">{branch.currency}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Security events + user management ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent audit / security events */}
        <section className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
            <h2 className="section-title">Recent activity</h2>
            <Link
              to="/audit"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
            >
              Full audit log
              <Icon name="arrowRight" size={12} />
            </Link>
          </div>
          {auditError !== null ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">Audit log unavailable.</p>
          ) : auditEntries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">
              {auditLoading ? 'Loading…' : 'No recent events.'}
            </p>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {auditEntries.map((entry) => {
                const isSecurity = SECURITY_EVENTS.some((s) => entry.event.includes(s));
                return (
                  <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                        isSecurity
                          ? 'bg-red-50 text-clinical-critical dark:bg-red-950/50'
                          : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
                      )}
                    >
                      <Icon name={isSecurity ? 'alertCircle' : 'audit'} size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-800 dark:text-stone-200">
                        {entry.event.replace(/[._-]/g, ' ')}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {entry.causer?.name ?? 'System'} · {timeAgo(entry.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* User management */}
        <section className="card overflow-hidden lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-4 py-3 dark:border-stone-800">
            <h2 className="section-title">Users</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Icon
                  name="search"
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search staff…"
                  className="input h-8 w-44 pl-8 text-xs"
                  aria-label="Search staff"
                />
              </div>
              <Link to="/admin/staff" className="btn-primary h-8 px-3 text-xs">
                <Icon name="plus" size={13} />
                Manage staff
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-200 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:border-stone-800">
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="hidden px-4 py-2.5 md:table-cell">Branch</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="hidden px-4 py-2.5 lg:table-cell">MFA</th>
                  <th className="hidden px-4 py-2.5 lg:table-cell">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {staffLoading && staff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-500">
                      Loading…
                    </td>
                  </tr>
                ) : staff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-stone-500">
                      No staff match your search.
                    </td>
                  </tr>
                ) : (
                  staff.slice(0, 8).map((member) => <UserRow key={member.id} member={member} />)
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
