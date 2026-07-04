import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBranches } from '@/features/branches/BranchProvider';
import { Icon } from '@/components/icons/Icon';
import { NAV_ITEMS, isNavItemVisible, type NavItem } from '@/config/navigation';
import type { IconName } from '@/components/icons/Icon';

/* ─── Module category metadata ──────────────────────────────────────────────── */
interface ModuleMeta {
  group: string;
  description: string;
  colorClass: string;       // Tailwind bg for icon container
  textClass: string;        // Tailwind text for icon
  borderHover: string;      // Tailwind hover border colour
}

const MODULE_META: Partial<Record<string, ModuleMeta>> = {
  '/': {
    group: 'Overview',
    description: 'Your personalised portal',
    colorClass: 'bg-brand-50 dark:bg-brand-950/50',
    textClass: 'text-brand-600 dark:text-brand-400',
    borderHover: 'hover:border-brand-300 dark:hover:border-brand-700',
  },
  '/queue/check-in': {
    group: 'Intake',
    description: 'Register walk-in patients',
    colorClass: 'bg-teal-50 dark:bg-teal-950/50',
    textClass: 'text-teal-600 dark:text-teal-400',
    borderHover: 'hover:border-teal-300 dark:hover:border-teal-700',
  },
  '/queue': {
    group: 'Intake',
    description: 'Manage all station boards',
    colorClass: 'bg-teal-50 dark:bg-teal-950/50',
    textClass: 'text-teal-600 dark:text-teal-400',
    borderHover: 'hover:border-teal-300 dark:hover:border-teal-700',
  },
  '/queue/board/TRI': {
    group: 'Intake',
    description: 'Triage & MTS assessment',
    colorClass: 'bg-orange-50 dark:bg-orange-950/50',
    textClass: 'text-orange-600 dark:text-orange-400',
    borderHover: 'hover:border-orange-300 dark:hover:border-orange-700',
  },
  '/patients': {
    group: 'Intake',
    description: 'Patient records & search',
    colorClass: 'bg-sky-50 dark:bg-sky-950/50',
    textClass: 'text-sky-600 dark:text-sky-400',
    borderHover: 'hover:border-sky-300 dark:hover:border-sky-700',
  },
  '/queue/board/DOC': {
    group: 'Clinical',
    description: 'SOAP notes & ICD-10 coding',
    colorClass: 'bg-indigo-50 dark:bg-indigo-950/50',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    borderHover: 'hover:border-indigo-300 dark:hover:border-indigo-700',
  },
  '/queue/board/LAB': {
    group: 'Diagnostics',
    description: 'Lab orders & results',
    colorClass: 'bg-violet-50 dark:bg-violet-950/50',
    textClass: 'text-violet-600 dark:text-violet-400',
    borderHover: 'hover:border-violet-300 dark:hover:border-violet-700',
  },
  '/queue/board/RAD': {
    group: 'Diagnostics',
    description: 'Radiology queue & imaging',
    colorClass: 'bg-purple-50 dark:bg-purple-950/50',
    textClass: 'text-purple-600 dark:text-purple-400',
    borderHover: 'hover:border-purple-300 dark:hover:border-purple-700',
  },
  '/queue/board/PHA': {
    group: 'Pharmacy',
    description: 'Dispense & stock management',
    colorClass: 'bg-emerald-50 dark:bg-emerald-950/50',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    borderHover: 'hover:border-emerald-300 dark:hover:border-emerald-700',
  },
  '/queue/board/BIL': {
    group: 'Finance',
    description: 'Invoices, payments & SHA',
    colorClass: 'bg-rose-50 dark:bg-rose-950/50',
    textClass: 'text-rose-600 dark:text-rose-400',
    borderHover: 'hover:border-rose-300 dark:hover:border-rose-700',
  },
  '/inventory': {
    group: 'Back Office',
    description: 'Stock & procurement',
    colorClass: 'bg-amber-50 dark:bg-amber-950/50',
    textClass: 'text-amber-600 dark:text-amber-400',
    borderHover: 'hover:border-amber-300 dark:hover:border-amber-700',
  },
  '/reports': {
    group: 'Back Office',
    description: 'Analytics & exports',
    colorClass: 'bg-slate-50 dark:bg-slate-900/50',
    textClass: 'text-slate-600 dark:text-slate-400',
    borderHover: 'hover:border-slate-300 dark:hover:border-slate-600',
  },
  '/branches': {
    group: 'Back Office',
    description: 'Facilities & branch config',
    colorClass: 'bg-slate-50 dark:bg-slate-900/50',
    textClass: 'text-slate-600 dark:text-slate-400',
    borderHover: 'hover:border-slate-300 dark:hover:border-slate-600',
  },
  '/audit': {
    group: 'Back Office',
    description: 'Security & audit logs',
    colorClass: 'bg-slate-50 dark:bg-slate-900/50',
    textClass: 'text-slate-600 dark:text-slate-400',
    borderHover: 'hover:border-slate-300 dark:hover:border-slate-600',
  },
  '/settings': {
    group: 'Back Office',
    description: 'System settings',
    colorClass: 'bg-slate-50 dark:bg-slate-900/50',
    textClass: 'text-slate-600 dark:text-slate-400',
    borderHover: 'hover:border-slate-300 dark:hover:border-slate-600',
  },
};

const GROUP_ORDER = ['Intake', 'Clinical', 'Diagnostics', 'Pharmacy', 'Finance', 'Back Office'];

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function greetingPrefix(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ─── Stat strip card ────────────────────────────────────────────────────────── */
interface StatCardProps {
  icon: IconName;
  label: string;
  value: string;
  iconClass: string;
  iconBg: string;
}

function StatCard({ icon, label, value, iconClass, iconBg }: StatCardProps): JSX.Element {
  return (
    <div className="stat-strip">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon name={icon} size={17} className={iconClass} />
      </div>
      <p className="mt-2 text-2xl font-bold text-stone-900 dark:text-stone-50">{value}</p>
      <p className="text-xs font-medium text-stone-500">{label}</p>
    </div>
  );
}

/* ─── Module tile ────────────────────────────────────────────────────────────── */
interface TileProps {
  item: NavItem;
  meta: ModuleMeta;
  index: number;
}

function ModuleTile({ item, meta, index }: TileProps): JSX.Element {
  const { t } = useTranslation(['nav']);
  return (
    <Link
      to={item.to}
      className={`group module-tile ${meta.borderHover}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Icon container */}
      <span className={`module-tile-icon ${meta.colorClass}`}>
        <Icon name={item.icon} size={22} className={meta.textClass} />
      </span>

      {/* Text */}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
          {t(item.key)}
        </span>
        <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
          {meta.description}
        </span>
      </span>

      {/* Arrow */}
      <Icon
        name="arrowRight"
        size={14}
        className="shrink-0 text-stone-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-stone-500 dark:text-stone-600 dark:group-hover:text-stone-400"
      />
    </Link>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
/**
 * Role-scoped landing portal. Renders one tile per module the signed-in user
 * may access (driven by the same RBAC-gated nav config as the sidebar), so a
 * receptionist sees check-in/queue/patients while a lab tech sees the LAB board.
 */
export function DashboardPage(): JSX.Element {
  const { t } = useTranslation(['nav', 'app']);
  const { user, hasPermission } = useAuth();
  const { activeBranch } = useBranches();
  const roles = user?.roles ?? [];
  const isSuperadmin = roles.includes('superadmin');
  const firstName = user?.name.split(' ')[0] ?? null;
  const primaryRoleLabel = isSuperadmin
    ? 'Superadmin - system root'
    : user?.roles[0]?.replace(/-/g, ' ') ?? null;
  const dashboardTitle = isSuperadmin
    ? 'System administration'
    : user !== null && firstName !== null
      ? `${greetingPrefix()}, ${firstName}`
      : t('app:name');
  const dashboardSubtitle = isSuperadmin
    ? 'Global configuration, audit, reports, and hospital setup'
    : activeBranch?.name ?? 'Hospital operations';
  const statCards = isSuperadmin
    ? [
        {
          icon: 'branches' as const,
          label: 'Configured branches',
          value: '—',
          iconBg: 'bg-sky-50 dark:bg-sky-950/50',
          iconClass: 'text-sky-600 dark:text-sky-400',
        },
        {
          icon: 'audit' as const,
          label: 'Security events',
          value: '—',
          iconBg: 'bg-rose-50 dark:bg-rose-950/50',
          iconClass: 'text-rose-600 dark:text-rose-400',
        },
        {
          icon: 'settings' as const,
          label: 'System controls',
          value: '—',
          iconBg: 'bg-stone-100 dark:bg-stone-900',
          iconClass: 'text-stone-600 dark:text-stone-300',
        },
      ]
    : [
        {
          icon: 'queue' as const,
          label: 'Active queue tickets',
          value: '—',
          iconBg: 'bg-teal-50 dark:bg-teal-950/50',
          iconClass: 'text-teal-600 dark:text-teal-400',
        },
        {
          icon: 'patients' as const,
          label: 'Patients seen today',
          value: '—',
          iconBg: 'bg-sky-50 dark:bg-sky-950/50',
          iconClass: 'text-sky-600 dark:text-sky-400',
        },
        {
          icon: 'triage' as const,
          label: 'Awaiting triage',
          value: '—',
          iconBg: 'bg-orange-50 dark:bg-orange-950/50',
          iconClass: 'text-orange-600 dark:text-orange-400',
        },
      ];

  // Everything the user can reach, minus the dashboard tile itself.
  const tiles = NAV_ITEMS.filter(
    (item) => item.to !== '/' && isNavItemVisible(item, roles, hasPermission),
  );

  // Group tiles by module category
  const grouped = GROUP_ORDER.reduce<Record<string, { item: NavItem; meta: ModuleMeta }[]>>(
    (acc, group) => {
      acc[group] = tiles
        .filter((item) => (MODULE_META[item.to]?.group ?? 'Back Office') === group)
        .map((item) => ({ item, meta: MODULE_META[item.to] ?? MODULE_META['/settings']! }));
      return acc;
    },
    {},
  );

  // Global tile index for stagger delay
  let tileIndex = 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in">
      {/* ── Greeting header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {user !== null && (
            <span className="avatar-lg shrink-0" aria-label={`Avatar for ${user.name}`}>
              {initials(user.name)}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">
              {dashboardTitle}
            </h1>
            <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
              {dashboardSubtitle}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {/* Role badge */}
              {primaryRoleLabel !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:ring-brand-800">
                  <Icon name="user" size={10} />
                  {primaryRoleLabel}
                </span>
              )}
              {/* Branch badge */}
              {activeBranch !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  <Icon name="branches" size={10} />
                  {activeBranch.name}
                  <span className="font-mono text-[10px] text-stone-400">({activeBranch.code})</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Current time */}
        <div className="text-right">
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <p className="text-xs text-stone-400">
            {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* ── Stat strip ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            iconBg={stat.iconBg}
            iconClass={stat.iconClass}
          />
        ))}
      </div>

      {/* ── Module groups ────────────────────────────────────────────────── */}
      {tiles.length === 0 ? (
        <div className="card p-8 text-center">
          <Icon name="lock" size={32} className="mx-auto text-stone-300 dark:text-stone-600" />
          <p className="mt-3 text-sm font-medium text-stone-500">No modules available for your role yet.</p>
        </div>
      ) : (
        GROUP_ORDER.map((group) => {
          const groupTiles = grouped[group];
          if (groupTiles === undefined || groupTiles.length === 0) return null;

          return (
            <section key={group}>
              {/* Section header */}
              <div className="mb-3 flex items-center gap-3">
                <h2 className="section-title">{group}</h2>
                <div className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
              </div>

              {/* Tile grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groupTiles.map(({ item, meta }) => {
                  const idx = tileIndex++;
                  return (
                    <ModuleTile
                      key={item.to}
                      item={item}
                      meta={meta}
                      index={idx}
                    />
                  );
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
