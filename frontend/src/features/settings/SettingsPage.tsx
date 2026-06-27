import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/icons/Icon';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useBranches } from '@/features/branches/BranchProvider';

const APP_NAME = 'Afya HMS';
const APP_VERSION = `v${import.meta.env.VITE_APP_VERSION ?? '0.1.0'}`;

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps): JSX.Element {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-3 border-b border-stone-100/50 dark:border-stone-800/50 last:border-0">
      <span className="text-sm font-medium text-stone-500">{label}</span>
      <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 text-right">{value}</span>
    </div>
  );
}

export default function SettingsPage(): JSX.Element {
  const { t, i18n } = useTranslation(['settings']);
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { activeBranch } = useBranches();
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'security' | 'system'>('profile');

  const currentLanguage = i18n.language.split('-')[0];
  const isDark = theme === 'dark';
  const dash = '—';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-stone-900 to-stone-500 dark:from-stone-100 dark:to-stone-400">
          {t('settings:title', 'Settings')}
        </h1>
        <p className="mt-2 text-sm text-stone-500 font-medium">
          {t('settings:subtitle', 'Manage your profile, preferences and system configuration')}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-2 bg-white/40 dark:bg-stone-950/40 p-2 rounded-2xl backdrop-blur-md border border-stone-200/50 dark:border-stone-800/50">
          {[
            { id: 'profile', icon: 'user', label: t('settings:profile.title', 'Profile') },
            { id: 'appearance', icon: 'sun', label: t('settings:appearance.title', 'Appearance & Language') },
            { id: 'security', icon: 'lock', label: t('settings:security.title', 'Security') },
            { id: 'system', icon: 'settings', label: t('settings:system.title', 'System Info') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-stone-800 shadow-sm text-brand-600 dark:text-brand-400 scale-[1.02]'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-900/50 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Icon name={tab.icon as any} size={18} className={activeTab === tab.id ? 'text-brand-500' : ''} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white/60 dark:bg-stone-900/40 rounded-3xl p-6 md:p-8 backdrop-blur-xl border border-stone-200/50 dark:border-stone-800/50 shadow-sm relative overflow-hidden min-h-[400px]">
          {/* Decorative glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl pointer-events-none"></div>

          {/* ─── Profile ─────────────────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 relative z-10 space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-stone-100 dark:border-stone-800">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-brand-500/20">
                  {user?.name?.charAt(0) ?? 'U'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">{user?.name ?? 'User Profile'}</h2>
                  <p className="text-sm text-stone-500">{user?.roles.join(', ') ?? 'No Role'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Email Address</label>
                  <div className="px-4 py-3 bg-stone-50 dark:bg-stone-950/50 rounded-xl text-sm font-medium border border-stone-100 dark:border-stone-800">
                    {user?.email ?? dash}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Phone Number</label>
                  <div className="px-4 py-3 bg-stone-50 dark:bg-stone-950/50 rounded-xl text-sm font-medium border border-stone-100 dark:border-stone-800">
                    {user?.phone ?? dash}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Current Branch</label>
                  <div className="px-4 py-3 bg-stone-50 dark:bg-stone-950/50 rounded-xl text-sm font-medium border border-stone-100 dark:border-stone-800 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Icon name="business" size={16} />
                    {user?.current_branch?.name ?? dash}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Appearance ──────────────────────────────────────────────────── */}
          {activeTab === 'appearance' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 relative z-10 space-y-8">
              <div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
                  <Icon name={isDark ? 'moon' : 'sun'} size={18} className="text-brand-500" />
                  {t('settings:appearance.title', 'Appearance')}
                </h3>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
                  <div>
                    <p className="font-semibold text-stone-900 dark:text-stone-100">
                      {t('settings:appearance.theme', 'Theme Preference')}
                    </p>
                    <p className="text-sm text-stone-500">
                      Switch between light and dark mode.
                    </p>
                  </div>
                  {/* Animated Toggle Switch */}
                  <button 
                    onClick={toggleTheme}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${isDark ? 'bg-brand-500' : 'bg-stone-300 dark:bg-stone-700'}`}
                  >
                    <span className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 flex items-center justify-center shadow-sm ${isDark ? 'translate-x-6' : 'translate-x-0'}`}>
                      <Icon name={isDark ? 'moon' : 'sun'} size={12} className={isDark ? 'text-brand-500' : 'text-stone-500'} />
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
                  <Icon name="user" size={18} className="text-brand-500" />
                  {t('settings:language.title', 'Language')}
                </h3>
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800 space-y-4">
                  <p className="font-semibold text-stone-900 dark:text-stone-100">
                    {t('settings:language.current', 'System Language')}
                  </p>
                  
                  {/* Segmented Control */}
                  <div className="flex bg-stone-200 dark:bg-stone-900 p-1 rounded-xl">
                    <button
                      type="button"
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${currentLanguage === 'en' ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                      onClick={() => void i18n.changeLanguage('en')}
                    >
                      {t('settings:language.english', 'English')}
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${currentLanguage === 'sw' ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                      onClick={() => void i18n.changeLanguage('sw')}
                    >
                      {t('settings:language.swahili', 'Swahili')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Security ────────────────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 relative z-10 space-y-6">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-4 flex items-center gap-2">
                <Icon name="lock" size={18} className="text-brand-500" />
                {t('settings:security.title', 'Security Settings')}
              </h3>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                    {t('settings:security.mfa', 'Multi-factor authentication')}
                    {user?.mfa_enabled && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-stone-500 mt-1 max-w-sm">
                    {t('settings:security.mfa_hint', 'Adds an extra layer of protection to your account by requiring a code.')}
                  </p>
                </div>
                
                <button className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:-translate-y-0.5 ${user?.mfa_enabled ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 hover:bg-rose-100 border border-rose-200 dark:border-rose-800' : 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 hover:shadow-md'}`}>
                  {user?.mfa_enabled ? 'Disable MFA' : 'Enable MFA'}
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
                 <p className="font-semibold text-stone-900 dark:text-stone-100 mb-1">Change Password</p>
                 <p className="text-sm text-stone-500 mb-4">Ensure your account is using a long, random password to stay secure.</p>
                 <button className="px-5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                   Update Password
                 </button>
              </div>
            </div>
          )}

          {/* ─── System ──────────────────────────────────────────────────────── */}
          {activeTab === 'system' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 relative z-10">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-6 flex items-center gap-2">
                <Icon name="settings" size={18} className="text-brand-500" />
                {t('settings:system.title', 'System Information')}
              </h3>
              
              <div className="bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800 p-2">
                <div className="bg-white dark:bg-stone-900 rounded-xl p-4 md:p-6 shadow-sm border border-stone-100/50 dark:border-stone-800/50 space-y-2">
                  <InfoRow label={t('settings:system.app', 'Application Name')} value={APP_NAME} />
                  <InfoRow label={t('settings:system.version', 'Version Build')} value={APP_VERSION} />
                  <InfoRow label="Environment" value="Production" />
                  <InfoRow label="Server Timezone" value={activeBranch?.timezone ?? 'UTC'} />
                  <InfoRow
                    label={t('settings:system.active_branch', 'Active branch')}
                    value={activeBranch?.name ?? dash}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
