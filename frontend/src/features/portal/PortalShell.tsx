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
  { to: '/portal', key: 'Home', icon: 'dashboard' },
  { to: '/portal/profile', key: 'My Profile', icon: 'user' },
  { to: '/portal/appointments', key: 'Appointments', icon: 'calendar' },
  { to: '/portal/records', key: 'Records', icon: 'fileText' },
  { to: '/portal/results', key: 'Results', icon: 'laboratory' },
  { to: '/portal/bills', key: 'Bills & Pay', icon: 'payments' },
  { to: '/portal/messages', key: 'Messages', icon: 'message' },
];

export function PortalShell(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async (): Promise<void> => {
    await logout();
    navigate('/login', { replace: true });
  };

  const SidebarContent = () => (
    <>
      <div className="p-lg flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
          <Icon name="medical" size={24} className="text-on-primary-container" />
        </div>
        <div>
          <h1 className="text-headline-md font-headline-md font-bold text-primary">Afya Portal</h1>
          <p className="text-body-sm text-on-surface-variant">Patient Access</p>
        </div>
      </div>
      <nav className="flex-1 mt-md overflow-y-auto">
        {PORTAL_NAV.map((item) => {
          const isActive = item.to === '/portal' 
            ? location.pathname === '/portal' 
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/portal'}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 font-body-md text-body-md transition-colors ${
                isActive
                  ? 'text-primary bg-primary-container/10 border-r-4 border-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <Icon name={item.icon as any} size={20} />
              {item.key}
            </NavLink>
          );
        })}
      </nav>
      <div className="px-md py-lg border-t border-outline-variant mt-auto">
        <button 
          onClick={() => {
            navigate('/portal/appointments');
            setMobileMenuOpen(false);
          }}
          className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-body-md font-semibold mb-lg hover:opacity-90 transition-opacity"
        >
          New Appointment
        </button>
        <div className="space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-primary transition-colors">
            <Icon name="info" size={20} />
            <span className="text-body-sm">Support</span>
          </a>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-error transition-colors"
          >
            <Icon name="logout" size={20} />
            <span className="text-body-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      {/* ── Mobile Sidebar Overlay ───────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div 
            className="fixed inset-0 z-40 bg-stone-900/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col bg-surface shadow-xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-[260px] h-full fixed left-0 top-0 flex-col bg-surface border-r border-outline-variant z-50">
        <SidebarContent />
      </aside>

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <header className="h-[64px] sticky top-0 z-40 bg-surface border-b border-outline-variant shadow-sm flex justify-between items-center px-4 lg:px-lg lg:ml-[260px] lg:w-[calc(100%-260px)]">
        <div className="flex items-center gap-3 w-full max-w-xl">
          <button
            type="button"
            className="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Icon name="menu" size={24} />
          </button>
          
          <div className="relative w-full hidden sm:block">
            <Icon name="search" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-body-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all" 
              placeholder="Search for records, test results, or bills..." 
              type="text"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-md shrink-0">
          <button 
            onClick={toggleTheme}
            className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={24} />
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all">
            <Icon name="bell" size={24} />
          </button>
          
          <div className="flex items-center gap-3 pl-2 sm:pl-md border-l border-outline-variant ml-1 sm:ml-md">
            <div className="text-right hidden sm:block">
              <p className="text-body-sm font-semibold truncate max-w-[150px]">{user?.name}</p>
              <p className="text-[11px] text-on-surface-variant font-label-caps uppercase truncate max-w-[150px]">Patient</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm">
              {user ? initials(user.name) : 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────────────────── */}
      <main className="lg:ml-[260px] p-4 lg:p-lg min-h-[calc(100vh-64px)] bg-background">
        <Outlet />
      </main>
    </div>
  );
}
