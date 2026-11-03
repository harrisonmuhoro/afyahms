import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBranches } from '@/features/branches/BranchProvider';
import { useKpis } from '@/features/queue/api';
import { Icon } from '@/components/icons/Icon';
import { NAV_ITEMS, NAV_SECTIONS, isNavItemVisible, type NavItem } from '@/config/navigation';
import { Alert, Panel, StatTile } from '@/components/ui';
import { roleLabel } from '@/components/layout/AppShell';
import { Activity, ListOrdered, UserCheck, HeartPulse } from 'lucide-react';
import { SuperadminDashboard } from './SuperadminDashboard';

/** One-line purpose for each workspace so staff know where a link leads. */
const MODULE_DESCRIPTIONS: Partial<Record<string, string>> = {
  '/profile': 'Your details, password and sign-in security',
  '/messages': 'Conversations with colleagues and patients',
  '/queue/check-in': 'Register walk-in patients and issue tickets',
  '/queue': 'All service points and who is waiting',
  '/queue/board/TRI': 'Vital signs and triage category',
  '/patients': 'Search, register and update patient records',
  '/appointments': 'Clinic bookings, schedules and no-shows',
  '/queue/board/DOC': 'Consultations, notes, orders and prescriptions',
  '/queue/board/LAB': 'Sample collection, processing and results',
  '/queue/board/RAD': 'Imaging requests and reports',
  '/queue/board/PHA': 'Prescriptions awaiting dispensing',
  '/queue/board/BIL': 'Invoices, payments, receipts and SHA claims',
  '/inventory': 'Stock levels, batches and expiry',
  '/admin/staff': 'Staff accounts, roles and access',
  '/reports': 'Clinical, financial and operational reports',
  '/branches': 'Facilities and branch configuration',
  '/audit': 'Who did what, and when',
  '/settings': 'Hospital-wide configuration',
};

/** Role → its focused work dashboard. */
const ROLE_WORKSPACE: Array<{ role: string; to: string; label: string }> = [
  { role: 'doctor', to: '/doctor-dashboard', label: 'Clinical dashboard' },
  { role: 'nurse', to: '/nurse-dashboard', label: 'Nursing dashboard' },
  { role: 'receptionist', to: '/receptionist-dashboard', label: 'Front desk dashboard' },
  { role: 'pharmacist', to: '/pharmacist-dashboard', label: 'Pharmacy dashboard' },
  { role: 'lab-technician', to: '/lab-dashboard', label: 'Laboratory dashboard' },
  { role: 'radiologist', to: '/radiologist-dashboard', label: 'Radiology dashboard' },
  { role: 'cashier', to: '/billing-dashboard', label: 'Billing dashboard' },
  { role: 'records-officer', to: '/records-dashboard', label: 'Records dashboard' },
];

function greetingPrefix(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function WorkspaceLink({ item, label }: { item: NavItem; label: string }): JSX.Element {
  return (
    <Link
      to={item.to}
      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-muted"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-secondary group-hover:bg-primary-soft group-hover:text-primary">
        <Icon name={item.icon} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {MODULE_DESCRIPTIONS[item.to] !== undefined && (
          <span className="block text-xs text-ink-muted">{MODULE_DESCRIPTIONS[item.to]}</span>
        )}
      </span>
      <Icon name="chevronRight" size={16} className="mt-2 shrink-0 text-line-strong group-hover:text-ink-muted" />
    </Link>
  );
}

export function DashboardPage(): JSX.Element {
  const { t } = useTranslation(['nav', 'app']);
  const { user, hasPermission } = useAuth();
  const { activeBranch } = useBranches();
  const { data: kpiData, isLoading: kpiLoading } = useKpis();
  const roles = user?.roles ?? [];

  if (roles.includes('superadmin')) {
    return <SuperadminDashboard />;
  }

  const now = new Date();
  const firstName = user?.name.split(' ')[0] ?? null;
  const visible = NAV_ITEMS.filter((item) => item.to !== '/' && isNavItemVisible(item, roles, hasPermission));
  const can = (to: string): boolean => visible.some((item) => item.to === to);
  const workspaces = ROLE_WORKSPACE.filter((w) => roles.includes(w.role));
  const awaitingTriage = kpiData?.awaiting_triage ?? 0;
  const activeTickets = kpiData?.active_tickets ?? 0;
  const showQueue = hasPermission('queue.read');

  const groups = NAV_SECTIONS.filter((section) => section !== 'workspace')
    .map((section) => ({ section, items: visible.filter((item) => item.section === section) }))
    .filter((g) => g.items.length > 0);
  const personal = visible.filter((item) => item.section === 'workspace');

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-ink-muted">
            {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-ink sm:text-[22px]">
            {firstName !== null ? `${greetingPrefix(now)}, ${firstName}` : t('app:name')}
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {roleLabel(roles[0])}
            {activeBranch !== null && <> · {activeBranch.name}</>}
          </p>
        </div>
        {workspaces.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {workspaces.map((w) => (
              <Link key={w.to} to={w.to} className="btn-primary">
                {w.label}
                <Icon name="arrowRight" size={16} />
              </Link>
            ))}
          </div>
        )}
      </header>

      {showQueue && (
        <section aria-labelledby="today-heading" className="space-y-3">
          <h2 id="today-heading" className="text-sm font-semibold text-ink">Today at this branch</h2>
          {awaitingTriage > 0 && can('/queue/board/TRI') && (
            <Alert
              tone="warning"
              title={`${awaitingTriage} ${awaitingTriage === 1 ? 'patient is' : 'patients are'} waiting for triage`}
              action={<Link to="/queue/board/TRI" className="btn-secondary btn-sm">Open triage</Link>}
            >
              Patients are assessed before they can be seen by a clinician.
            </Alert>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatTile
              label="In the queue now"
              value={activeTickets}
              hint="Active tickets across all service points"
              icon={ListOrdered}
              tone="primary"
              loading={kpiLoading && kpiData === null}
              to="/queue"
            />
            <StatTile
              label="Patients seen today"
              value={kpiData?.patients_seen ?? 0}
              hint="Visits completed since midnight"
              icon={UserCheck}
              tone="success"
              loading={kpiLoading && kpiData === null}
            />
            <StatTile
              label="Awaiting triage"
              value={awaitingTriage}
              hint={awaitingTriage > 0 ? 'Needs nursing attention' : 'No one waiting'}
              icon={HeartPulse}
              tone={awaitingTriage > 0 ? 'warning' : 'neutral'}
              loading={kpiLoading && kpiData === null}
              to={can('/queue/board/TRI') ? '/queue/board/TRI' : undefined}
            />
          </div>
        </section>
      )}

      {visible.length === 0 ? (
        <Panel>
          <div className="flex flex-col items-center py-8 text-center">
            <Activity aria-hidden size={22} className="text-ink-muted" />
            <p className="mt-3 text-sm font-medium text-ink">No work areas are assigned to your role yet</p>
            <p className="mt-1 text-[13px] text-ink-muted">Ask your hospital administrator to review your role and permissions.</p>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:col-span-2">
            {groups.map(({ section, items }) => (
              <Panel key={section} title={t(`nav:section_${section}`)} flush bodyClassName="p-1.5">
                {items.map((item) => (
                  <WorkspaceLink key={item.to} item={item} label={t(item.key)} />
                ))}
              </Panel>
            ))}
          </div>
          {personal.length > 0 && (
            <Panel title="Your account" flush bodyClassName="p-1.5" className="self-start">
              {personal.map((item) => (
                <WorkspaceLink key={item.to} item={item} label={t(item.key)} />
              ))}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
