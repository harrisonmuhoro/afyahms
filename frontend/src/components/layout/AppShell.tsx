import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useBranches } from '@/features/branches/BranchProvider';
import { Icon } from '@/components/icons/Icon';
import { NAV_ITEMS } from '@/config/navigation';

/* ─── helpers ───────────────────────────────────────────────────────────────── */
function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

/* ─── Sidebar nav section labels by module group ─────────────────────────── */
const SECTION_BEFORE: Record<string, string> = {
  '/queue/check-in': 'Intake',
  '/queue/board/DOC': 'Clinical',
  '/queue/board/LAB': 'Diagnostics',
  '/queue/board/BIL': 'Finance',
  '/inventory': 'Back Office',
};

/* ─── Component ─────────────────────────────────────────────────────────────── */
export function AppShell(): JSX.Element {
  const { t } = useTranslation(['nav', 'auth', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { activeBranch } = useBranches();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login', { replace: true });
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.permission === undefined || hasPermission(item.permission),
  );

  /* Derive page title from current nav item */
  const currentItem = visibleItems.find((item) => {
    if (item.end === true) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  });

  const pageTitle = currentItem !== undefined ? t(currentItem.key) : '';

  /* ─── Sidebar content (shared between desktop rail and mobile drawer) ─── */
  const SidebarContent = (): JSX.Element => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Icon name="heartPulse" size={20} className="text-teal-200" />
        </div>
        <div className="min-w-0">
          <span className="block truncate text-sm font-bold text-white">Afya HMS</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="pulse-dot" aria-label="System online" />
            <span className="text-[10px] font-medium text-teal-300/70">Online</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {visibleItems.map((item) => (
          <div key={item.to}>
            {SECTION_BEFORE[item.to] !== undefined && (
              <p className="sidebar-section-label mt-3 mb-1">{SECTION_BEFORE[item.to]}</p>
            )}
            <NavLink
              to={item.to}
              end={item.end ?? false}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-nav-link${isActive ? ' sidebar-nav-link-active' : ''}`
              }
            >
              <Icon name={item.icon} size={17} className="shrink-0" />
              <span className="truncate">{t(item.key)}</span>
            </NavLink>
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10" />

      {/* User chip + logout */}
      {user !== null && (
        <div className="px-3 py-4 space-y-2">
          {/* Avatar + name row */}
          <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
            <span
              className="avatar-sm shrink-0"
              style={{ background: 'rgba(255,255,255,0.25)', color: 'white' }}
              aria-label={`Avatar for ${user.name}`}
            >
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user.name}</p>
              <p className="truncate text-[10px] text-teal-300/70">{user.roles[0] ?? 'User'}</p>
            </div>
          </div>

          {/* Logout button */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-teal-200/70 transition-all hover:bg-white/10 hover:text-white"
          >
            <Icon name="logout" size={15} className="shrink-0" />
            {t('auth:logout')}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="sidebar hidden w-64 shrink-0 shadow-xl md:flex md:flex-col">
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-20 bg-stone-950/50 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="sidebar fixed inset-y-0 left-0 z-30 w-72 shadow-2xl animate-slide-up md:hidden">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="topbar z-10 shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label="Open menu"
              className="btn-ghost -ml-1 p-2 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="menu" size={20} />
            </button>

            {/* Breadcrumb page title */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-stone-900 dark:text-stone-50">{pageTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Branch switcher pill */}
            {activeBranch !== null && (
              <div className="relative">
                <button
                  type="button"
                  id="branch-switcher-btn"
                  onClick={() => setSwitcherOpen((c) => !c)}
                  className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition-all hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                >
                  <Icon name="branches" size={12} className="text-brand-600 dark:text-brand-400" />
                  {activeBranch.name}
                  <span className="rounded bg-stone-100 px-1 font-mono text-[10px] text-stone-500 dark:bg-stone-700 dark:text-stone-400">
                    {activeBranch.code}
                  </span>
                  <Icon name="chevronDown" size={12} className="text-stone-400" />
                </button>
              </div>
            )}

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-all hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
            </button>

            {/* Notification bell (non-functional, placeholder) */}
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-all hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
              <Icon name="bell" size={16} />
            </button>

            {/* User avatar */}
            {user !== null && (
              <span
                className="avatar-sm cursor-default"
                title={user.name}
                aria-label={`Signed in as ${user.name}`}
              >
                {initials(user.name)}
              </span>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* Branch-switcher backdrop */}
      {switcherOpen && (
        <button
          type="button"
          aria-label="Close branch switcher"
          className="fixed inset-0 z-10 cursor-default"
          onClick={() => setSwitcherOpen(false)}
        />
      )}
    </div>
  );
}