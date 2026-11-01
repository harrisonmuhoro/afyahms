import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useBranches } from '@/features/branches/BranchProvider';
import { NotificationsDropdown } from '@/features/notifications/NotificationsDropdown';
import { usePatientSearch } from '@/features/patients/api';
import { Icon } from '@/components/icons/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { Breadcrumbs, type Crumb } from '@/components/ui/PageHeader';
import { NAV_ITEMS, NAV_SECTIONS, isNavItemVisible } from '@/config/navigation';
import { cn } from '@/lib/cn';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
export function roleLabel(role: string | undefined): string {
  if (!role) return 'Staff';
  const map: Record<string, string> = {
    superadmin: 'System administrator',
    'hospital-admin': 'Hospital administrator',
    'records-officer': 'Records officer',
    'lab-technician': 'Laboratory technologist',
  };
  return map[role] ?? role.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

const STATION_LABELS: Record<string, string> = {
  TRI: 'Triage',
  DOC: 'Consultation',
  LAB: 'Laboratory',
  RAD: 'Radiology',
  PHA: 'Pharmacy',
  BIL: 'Billing',
};

const SEGMENT_LABELS: Record<string, string> = {
  patients: 'Patients',
  new: 'New registration',
  appointments: 'Appointments',
  schedules: 'Doctor schedules',
  book: 'Book appointment',
  reschedule: 'Reschedule',
  queue: 'Queue',
  'check-in': 'Check-in',
  triage: 'Triage',
  emr: 'Clinical workspace',
  encounter: 'Encounter',
  pharmacy: 'Pharmacy',
  medications: 'Medicines',
  prescriptions: 'Prescriptions',
  inventory: 'Inventory',
  reports: 'Reports',
  financial: 'Financial',
  clinical: 'Clinical',
  operational: 'Operational',
  audit: 'Audit log',
  settings: 'Settings',
  admin: 'Administration',
  staff: 'Staff',
  branches: 'Branches',
  profile: 'My profile',
  messages: 'Messages',
};

function humanize(segment: string): string {
  const text = segment.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Derives breadcrumb trail from the URL so every screen has orientation. */
function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();
  return useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return [];
    const crumbs: Crumb[] = [{ label: 'Home', to: '/' }];
    if (parts[0] === 'queue' && parts[1] === 'board' && parts[2] !== undefined) {
      crumbs.push({ label: 'Queue', to: '/queue' }, { label: STATION_LABELS[parts[2]] ?? parts[2] });
      return crumbs;
    }
    let path = '';
    parts.forEach((part, i) => {
      path += `/${part}`;
      const isId = /^[0-9a-f-]{8,}$/i.test(part) || /^\d+$/.test(part);
      const label = isId ? 'Details' : (SEGMENT_LABELS[part] ?? humanize(part));
      const linkable = !['admin', 'emr', 'encounter', 'financial', 'clinical', 'operational'].includes(part) && !(parts[0] === 'queue' && part === 'triage');
      crumbs.push({ label, to: i < parts.length - 1 && linkable ? path : undefined });
    });
    return crumbs;
  }, [pathname]);
}

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* ─── Global patient search ───────────────────────────────────────────────── */
function PatientSearchBox(): JSX.Element {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounced = useDebounced(query, 250);
  const { hits, isLoading } = usePatientSearch(debounced, 8);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const typing = target !== null && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (event.key === '/' && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onClick = (event: MouseEvent): void => {
      if (wrapRef.current !== null && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  useEffect(() => setActive(-1), [debounced]);

  const go = (path: string): void => {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    navigate(path);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const hit = hits[active];
      if (hit !== undefined) go(`/patients/${hit.id}`);
      else if (query.trim() !== '') go(`/patients?q=${encodeURIComponent(query.trim())}`);
    } else if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-patient-search-results"
        aria-activedescendant={active >= 0 ? `patient-hit-${active}` : undefined}
        aria-label="Search patients by name, patient number, phone or ID number"
        className="h-9 w-full rounded-lg border border-line bg-surface-muted pl-9 pr-10 text-sm text-ink placeholder:text-ink-muted transition-colors focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
        placeholder="Search patients — name, number, phone or ID"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 font-mono text-[11px] text-ink-muted lg:block">
        /
      </kbd>

      {showPanel && (
        <div
          id="global-patient-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface shadow-overlay"
        >
          {isLoading && hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-muted">Searching patients…</p>
          ) : hits.length === 0 ? (
            <div className="px-4 py-3 text-sm">
              <p className="text-ink">No patients match “{query.trim()}”.</p>
              <p className="mt-0.5 text-xs text-ink-muted">Check the spelling, or try a phone number or patient number.</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {hits.map((hit, i) => (
                <li key={hit.id} id={`patient-hit-${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(`/patients/${hit.id}`)}
                    className={cn('flex w-full items-center gap-3 px-3 py-2 text-left', i === active && 'bg-surface-muted')}
                  >
                    <Avatar name={hit.full_name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{hit.full_name}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        <span className="font-mono">{hit.patient_number}</span>
                        {hit.age !== null && ` · ${hit.age} yrs`}
                        {hit.gender !== null && ` · ${hit.gender.charAt(0).toUpperCase()}`}
                        {hit.phone !== null && ` · ${hit.phone}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => go(`/patients?q=${encodeURIComponent(query.trim())}`)}
            className="flex w-full items-center justify-between border-t border-line bg-surface-muted/60 px-3 py-2 text-xs font-medium text-primary hover:bg-surface-muted"
          >
            See all results in the patient register
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── User menu ───────────────────────────────────────────────────────────── */
function UserMenu({ onLogout }: { onLogout: () => void }): JSX.Element | null {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation(['auth', 'nav']);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent): void => {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const esc = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (user === null) return null;
  const isPatient = user.roles.includes('patient');

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface-muted"
      >
        <Avatar name={user.name} src={user.profile_photo_path} size="sm" />
        <span className="hidden text-left lg:block">
          <span className="block max-w-[160px] truncate text-[13px] font-medium leading-tight text-ink">{user.name}</span>
          <span className="block max-w-[160px] truncate text-[11px] leading-tight text-ink-muted">{roleLabel(user.roles[0])}</span>
        </span>
        <Icon name="chevronDown" size={14} className="hidden text-ink-muted lg:block" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-overlay">
          <div className="border-b border-line px-3 py-2.5">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
          </div>
          {!isPatient && (
            <Link role="menuitem" to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm text-ink-secondary hover:bg-surface-muted hover:text-ink">
              <Icon name="user" size={16} /> My profile
            </Link>
          )}
          <button role="menuitem" type="button" onClick={toggleTheme} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-ink-secondary hover:bg-surface-muted hover:text-ink">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
            {theme === 'dark' ? 'Light appearance' : 'Dark appearance'}
          </button>
          <div className="my-1 h-px bg-line" />
          <button role="menuitem" type="button" onClick={onLogout} className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger-soft">
            <Icon name="logout" size={16} /> {t('auth:logout')}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Branch context ──────────────────────────────────────────────────────── */
function BranchContext({ compact = false }: { compact?: boolean }): JSX.Element | null {
  const { user, switchBranch } = useAuth();
  const { activeBranch } = useBranches();
  const [pending, setPending] = useState(false);
  const branches = user?.branches ?? [];
  const current = user?.current_branch ?? activeBranch;
  if (current === null || current === undefined) return null;

  if (branches.length <= 1) {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-ink-secondary', compact && 'hidden')}>
        <Icon name="location" size={14} className="text-ink-muted" />
        <span className="truncate">{current.name}</span>
      </div>
    );
  }

  return (
    <label className="relative block">
      <span className="sr-only">Active branch</span>
      <Icon name="location" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
      <select
        value={current.id}
        disabled={pending}
        onChange={async (e) => {
          setPending(true);
          try {
            await switchBranch(Number(e.target.value));
          } finally {
            setPending(false);
          }
        }}
        className="h-8 w-full appearance-none truncate rounded-lg border border-line bg-surface pl-7 pr-7 text-xs font-medium text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      >
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <Icon name="chevronsUpDown" size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted" />
    </label>
  );
}

/* ─── Shell ───────────────────────────────────────────────────────────────── */
export function AppShell(): JSX.Element {
  const { t } = useTranslation(['nav', 'auth', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const breadcrumbs = useBreadcrumbs();

  const { user, logout, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => setSidebarOpen(false), [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const esc = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [sidebarOpen]);

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login', { replace: true });
  };

  const visibleItems = NAV_ITEMS.filter((item) => isNavItemVisible(item, user?.roles ?? [], hasPermission));
  const groups = NAV_SECTIONS.map((section) => ({
    section,
    items: visibleItems.filter((item) => item.section === section),
  })).filter((g) => g.items.length > 0);
  const canSearchPatients = hasPermission('patients.read') && !(user?.roles ?? []).includes('patient');

  const sidebar = (
    <div className="flex h-full flex-col border-r border-line bg-surface">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
          <Icon name="medical" size={17} strokeWidth={2} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-[15px] font-semibold tracking-tight text-ink">AfyaHMS</p>
          <p className="truncate text-[11px] text-ink-muted">Hospital information system</p>
        </div>
      </div>

      <div className="border-b border-line px-3 py-3">
        <BranchContext />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map(({ section, items }) => (
          <div key={section}>
            <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              {t(`nav:section_${section}`)}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end ?? item.to === '/queue'}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-soft text-primary'
                          : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
                      )
                    }
                  >
                    <Icon name={item.icon} size={18} className="shrink-0" />
                    <span className="truncate">{t(item.key)}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {user !== null && (
        <div className="space-y-0.5 border-t border-line p-3">
          <NavLink
            to="/messages"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-primary-soft text-primary' : 'text-ink-secondary hover:bg-surface-muted hover:text-ink',
              )
            }
          >
            <Icon name="help" size={18} /> Help &amp; support
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-secondary transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <Icon name="logout" size={18} /> {t('auth:logout')}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden bg-canvas text-ink">
      <a href="#main-content" className="sr-only z-[60] rounded-lg bg-surface px-3 py-2 text-sm font-medium text-primary focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to main content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] lg:block">{sidebar}</aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-stone-950/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[min(288px,85vw)] animate-slide-up shadow-overlay">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden lg:ml-[248px]">
        <header data-app-header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5">
          <button
            type="button"
            aria-label="Open menu"
            className="btn-icon h-10 w-10 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Icon name="menu" size={20} />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-4">
            {canSearchPatients ? <PatientSearchBox /> : <Breadcrumbs items={breadcrumbs} className="hidden sm:block" />}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <NotificationsDropdown />
            <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
            <UserMenu onLogout={handleLogout} />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto focus:outline-none">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            {canSearchPatients && breadcrumbs.length > 1 && <Breadcrumbs items={breadcrumbs} className="no-print mb-3" />}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
