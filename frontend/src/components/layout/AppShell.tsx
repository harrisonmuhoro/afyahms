import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useBranches } from '@/features/branches/BranchProvider';
import { NotificationsDropdown } from '@/features/notifications/NotificationsDropdown';
import { Icon } from '@/components/icons/Icon';
import { NAV_ITEMS, isNavItemVisible } from '@/config/navigation';
import { cn } from '@/lib/cn';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

/* ─── Sidebar section labels by module group ─────────────────────────────── */
const SECTION_BEFORE: Record<string, string> = {
  '/queue/check-in':   'Intake',
  '/queue/board/DOC':  'Clinical',
  '/queue/board/LAB':  'Diagnostics',
  '/queue/board/BIL':  'Finance',
  '/inventory':        'Back Office',
};

/* ─── Component ─────────────────────────────────────────────────────────────── */
export function AppShell(): JSX.Element {
  const { t } = useTranslation(['nav', 'auth', 'common']);
  const navigate = useNavigate();

  const { user, logout, hasPermission } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { activeBranch } = useBranches();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login', { replace: true });
  };

  const visibleItems = NAV_ITEMS.filter((item) => isNavItemVisible(item, user?.roles ?? [], hasPermission));


  /* ─── Sidebar content ─── */
  const SidebarContent = (): JSX.Element => (
    <div className="flex h-full flex-col bg-surface dark:bg-inverse-surface border-r border-outline-variant dark:border-on-surface-variant">
      {/* Logo */}
      <div className="p-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
          </div>
          <div>
            <h1 className="text-headline-md font-headline-md font-bold text-primary dark:text-primary-fixed leading-tight">Afya HMS</h1>
            {activeBranch !== null && (
              <p className="text-body-sm text-on-surface-variant">{activeBranch.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-outline-variant dark:bg-on-surface-variant/30" />

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-sm py-3 space-y-1">
        {visibleItems.map((item) => (
          <div key={item.to}>
            {SECTION_BEFORE[item.to] !== undefined && (
              <p className="px-4 mb-1 mt-4 text-[10px] font-bold uppercase tracking-widest text-outline">{SECTION_BEFORE[item.to]}</p>
            )}
            <NavLink
              to={item.to}
              end={item.end ?? false}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 text-body-md font-body-md transition-colors',
                  isActive
                    ? 'text-primary dark:text-primary-fixed bg-primary-container/10 dark:bg-primary-container/20 border-r-4 border-primary dark:border-primary-fixed font-semibold'
                    : 'text-on-surface-variant dark:text-surface-variant hover:bg-surface-container dark:hover:bg-on-surface-variant/20 hover:text-primary',
                )
              }
            >
              <Icon name={item.icon} size={20} className="shrink-0" />
              <span className="truncate">{t(item.key)}</span>
            </NavLink>
          </div>
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-outline-variant dark:bg-on-surface-variant/30" />

      {/* User chip + logout */}
      {user !== null && (
        <div className="px-sm pb-lg mt-2 space-y-1">
          <button
            type="button"
            onClick={() => {
              navigate('/messages');
              setSidebarOpen(false);
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-on-surface-variant dark:text-stone-300 hover:bg-surface-container dark:hover:bg-stone-800 hover:text-primary transition-colors rounded-lg text-body-md font-body-md"
          >
            <span className="material-symbols-outlined">help</span>
            Support
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-error hover:bg-error-container rounded-lg transition-colors text-body-md font-body-md"
          >
            <span className="material-symbols-outlined">logout</span>
            {t('auth:logout')}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden bg-surface-bright dark:bg-stone-950 text-on-surface dark:text-stone-100">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden w-[260px] shrink-0 md:flex md:flex-col fixed left-0 top-0 h-full z-50">
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-20 bg-stone-950/50 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-30 w-[260px] shadow-2xl md:hidden">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* ── Main column ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden md:ml-[260px]">
        {/* Top bar — exactly matching design: h-[64px], sticky, bg-surface, border-b, px-lg */}
        <header className="h-[64px] sticky top-0 z-40 bg-surface dark:bg-inverse-surface border-b border-outline-variant dark:border-on-surface-variant shadow-[0px_1px_3px_rgba(0,0,0,0.05)] flex justify-between items-center px-lg">
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label="Open menu"
              className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="menu" size={20} />
            </button>

            {/* Global search */}
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline" aria-hidden="true">search</span>
              <input
                aria-label="Search patients, results, or clinical notes"
                className="w-full bg-surface-container-low border border-outline-variant rounded-full py-2 pl-10 pr-4 text-body-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                placeholder="Search patients, results, or clinical notes..."
                type="search"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>

            <NotificationsDropdown />

            <div className="h-6 w-[1px] bg-outline-variant mx-2" />

            {/* Branch switcher */}
            {activeBranch !== null && (
              <div className="relative">
                <button
                  type="button"
                  id="branch-switcher-btn"
                  onClick={() => setSwitcherOpen((c) => !c)}
                  className="flex items-center gap-1.5 rounded-lg border border-outline-variant bg-white px-2.5 py-1.5 text-xs font-medium text-on-surface shadow-sm transition-all hover:bg-surface-container"
                >
                  <Icon name="branches" size={12} className="text-primary" />
                  {activeBranch.name}
                  <span className="rounded bg-surface-container px-1 font-mono text-[10px] text-tertiary">
                    {activeBranch.code}
                  </span>
                  <Icon name="chevronDown" size={12} className="text-outline" />
                </button>
              </div>
            )}

            {/* User chip */}
            {user !== null && (
              <div className="flex items-center gap-3 cursor-pointer hover:bg-surface-container-high px-3 py-1.5 rounded-full transition-all">
                <div className="text-right hidden sm:block">
                  <p className="text-label-caps font-bold text-primary">{user.name}</p>
                  <p className="text-[10px] text-tertiary">{user.roles?.[0] ?? 'Staff'}</p>
                </div>
                {user.profile_photo_path ? (
                  <img
                    src={user.profile_photo_path}
                    alt={user.name}
                    className="h-8 w-8 rounded-full object-cover border border-outline-variant"
                    title={user.name}
                  />
                ) : (
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold border border-outline-variant"
                    title={user.name}
                  >
                    {initials(user.name)}
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-surface-container-lowest dark:bg-inverse-surface">
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
