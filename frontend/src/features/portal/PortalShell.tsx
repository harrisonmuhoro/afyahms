import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { Icon } from '@/components/icons/Icon';

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

const PORTAL_NAV = [
  { to: '/portal', key: 'Home' },
  { to: '/portal/appointments', key: 'Appointments' },
  { to: '/portal/records', key: 'Records' },
  { to: '/portal/results', key: 'Results' },
  { to: '/portal/bills', key: 'Bills & Pay' },
  { to: '/portal/messages', key: 'Messages' },
];

export function PortalShell(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      {/* ── Top Navigation Bar ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 md:px-8">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden -ml-2 p-2 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Icon name="menu" size={24} />
          </button>
          
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600">
            <Icon name="heartPulse" size={20} className="text-white" />
          </div>
          <span className="hidden text-lg font-bold text-teal-800 dark:text-teal-400 md:block">
            Afya Portal
          </span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden items-center gap-1 md:flex">
          {PORTAL_NAV.map((item) => {
            const isActive = item.to === '/portal' 
              ? location.pathname === '/portal' 
              : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/portal'}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                    : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100'
                }`}
              >
                {item.key}
              </NavLink>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} />
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-900/50 dark:text-teal-300"
            >
              <span className="text-sm font-bold">{user ? initials(user.name) : 'U'}</span>
            </button>

            {profileOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setProfileOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-48 z-50 rounded-xl border border-stone-200 bg-white p-2 shadow-lg dark:border-stone-700 dark:bg-stone-800">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{user?.name}</p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">{user?.email}</p>
                  </div>
                  <div className="my-1 h-px bg-stone-100 dark:bg-stone-700" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Icon name="logout" size={16} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile Navigation Drawer ─────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div 
            className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="fixed inset-y-0 left-0 z-50 w-64 bg-white p-4 shadow-xl dark:bg-stone-900">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-bold text-teal-800 dark:text-teal-400">Afya Portal</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-stone-500">
                <Icon name="close" size={24} />
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {PORTAL_NAV.map((item) => {
                const isActive = item.to === '/portal' 
                  ? location.pathname === '/portal' 
                  : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`rounded-xl px-4 py-3 text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100'
                    }`}
                  >
                    {item.key}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      {/* ── Main Content Area ──────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
