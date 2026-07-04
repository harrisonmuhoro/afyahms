import { useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/icons/Icon';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { useBranches } from '@/features/branches/BranchProvider';
import { HttpError } from '@/lib/http';
import { QRCodeSVG } from 'qrcode.react';

const APP_NAME = 'Afya HMS';
const APP_VERSION = `v${import.meta.env.VITE_APP_VERSION ?? '0.1.0'}`;

interface InfoRowProps {
  label: string;
  value: string;
}

type SecurityModal = 'password' | 'mfa-enable' | 'mfa-disable' | null;

interface MfaEnrollment {
  secret: string;
  qr_url: string;
  recovery_codes: string[];
}

interface SettingsModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}

function InfoRow({ label, value }: InfoRowProps): JSX.Element {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-3 border-b border-stone-100/50 dark:border-stone-800/50 last:border-0">
      <span className="text-sm font-medium text-stone-500">{label}</span>
      <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 text-right">{value}</span>
    </div>
  );
}

function SettingsModal({ title, children, onClose, maxWidth = 'max-w-lg' }: SettingsModalProps): JSX.Element {
  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm"
        onClick={() => onClose()}
        aria-hidden="true"
      />
      <div className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-800 dark:bg-stone-900`}>
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 dark:border-stone-800 shrink-0">
          <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{title}</h3>
          <button
            type="button"
            onClick={() => onClose()}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

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

export default function SettingsPage(): JSX.Element {
  const { t, i18n } = useTranslation(['settings']);
  const {
    updatePreferences,
    user,
    changePassword,
    startMfaEnrollment,
    verifyMfaEnrollment,
    disableMfa,
  } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { activeBranch } = useBranches();
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'security' | 'system'>('profile');
  const [securityModal, setSecurityModal] = useState<SecurityModal>(null);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [mfaEnrollment, setMfaEnrollment] = useState<MfaEnrollment | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);

  const currentLanguage = i18n.language.split('-')[0];
  const isDark = theme === 'dark';
  const handleLanguageChange = (locale: string): void => {
    void i18n.changeLanguage(locale);
    void updatePreferences({ locale });
  };

  const closeSecurityModal = (force = false): void => {
    if (securityBusy && !force) {
      return;
    }

    setSecurityModal(null);
    setSecurityError(null);
    setMfaEnrollment(null);
    setMfaCode('');
    setDisablePassword('');
    setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
  };

  const openPasswordModal = (): void => {
    setSecurityError(null);
    setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
    setSecurityModal('password');
  };

  const openDisableMfaModal = (): void => {
    setSecurityError(null);
    setDisablePassword('');
    setSecurityModal('mfa-disable');
  };

  const openEnableMfaModal = async (): Promise<void> => {
    setSecurityModal('mfa-enable');
    setSecurityError(null);
    setMfaEnrollment(null);
    setMfaCode('');
    setSecurityBusy(true);

    try {
      const enrollment = await startMfaEnrollment();
      setMfaEnrollment({
        secret: enrollment.secret,
        qr_url: enrollment.qr_url,
        recovery_codes: enrollment.recovery_codes,
      });
    } catch (err) {
      setSecurityError(errorMessage(err));
    } finally {
      setSecurityBusy(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSecurityError(null);

    if (passwordForm.password !== passwordForm.password_confirmation) {
      setSecurityError('New password and confirmation do not match.');
      return;
    }

    setSecurityBusy(true);
    try {
      await changePassword(passwordForm);
      toast('Password updated. Other active sessions were invalidated.', 'success');
      closeSecurityModal(true);
    } catch (err) {
      setSecurityError(errorMessage(err));
    } finally {
      setSecurityBusy(false);
    }
  };

  const handleMfaVerify = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSecurityError(null);
    setSecurityBusy(true);

    try {
      await verifyMfaEnrollment(mfaCode);
      toast('MFA enabled for your account.', 'success');
      closeSecurityModal(true);
    } catch (err) {
      setSecurityError(errorMessage(err));
    } finally {
      setSecurityBusy(false);
    }
  };

  const handleDisableMfa = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSecurityError(null);
    setSecurityBusy(true);

    try {
      await disableMfa(disablePassword);
      toast('MFA disabled for your account.', 'success');
      closeSecurityModal(true);
    } catch (err) {
      setSecurityError(errorMessage(err));
    } finally {
      setSecurityBusy(false);
    }
  };
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
                      onClick={() => handleLanguageChange('en')}
                    >
                      {t('settings:language.english', 'English')}
                    </button>
                    <button
                      type="button"
                      className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${currentLanguage === 'sw' ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
                      onClick={() => handleLanguageChange('sw')}
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
                
                <button
                  type="button"
                  disabled={securityBusy}
                  onClick={user?.mfa_enabled ? openDisableMfaModal : () => { void openEnableMfaModal(); }}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${user?.mfa_enabled ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 hover:bg-rose-100 border border-rose-200 dark:border-rose-800' : 'bg-stone-900 text-white dark:bg-white dark:text-stone-900 hover:shadow-md'}`}
                >
                  {user?.mfa_enabled ? 'Disable MFA' : 'Enable MFA'}
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-100 dark:border-stone-800">
                 <p className="font-semibold text-stone-900 dark:text-stone-100 mb-1">Change Password</p>
                 <p className="text-sm text-stone-500 mb-4">Ensure your account is using a long, random password to stay secure.</p>
                 <button
                   type="button"
                   onClick={openPasswordModal}
                   className="px-5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-semibold hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                 >
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

          {/* ─── Modals ──────────────────────────────────────────────────────── */}
          {securityModal === 'mfa-enable' && (
            <SettingsModal title="Enable Multi-Factor Authentication" onClose={closeSecurityModal} maxWidth="max-w-2xl">
              <div className="space-y-4">
                {securityError && <div className="text-red-500 text-sm font-semibold">{securityError}</div>}
                {!mfaEnrollment ? (
                  <p className="text-sm text-stone-500">Initializing...</p>
                ) : (
                  <form onSubmit={handleMfaVerify} className="space-y-5">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      {/* Left: QR code + secret */}
                      <div className="flex flex-col items-center gap-3 shrink-0">
                        <div className="p-4 bg-white dark:bg-white rounded-2xl shadow-inner border border-stone-100 dark:border-stone-300">
                          <QRCodeSVG
                            value={mfaEnrollment.qr_url}
                            size={220}
                            level="M"
                            marginSize={4}
                            bgColor="#ffffff"
                            fgColor="#111827"
                            aria-label="Authenticator app QR code"
                          />
                        </div>
                        <p className="text-[10px] text-stone-400 text-center font-mono break-all max-w-[228px]">
                          {mfaEnrollment.secret}
                        </p>
                      </div>

                      {/* Right: instructions + code input + recovery codes */}
                      <div className="flex-1 space-y-4">
                        <div>
                          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Step 1</p>
                          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                            Open <span className="font-semibold text-stone-700 dark:text-stone-200">Google Authenticator</span> or <span className="font-semibold text-stone-700 dark:text-stone-200">Authy</span> and scan the QR code on the left.
                          </p>
                        </div>

                        <div>
                          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">Step 2</p>
                          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">Enter the 6-digit code shown in your authenticator app.</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">Verification Code</label>
                          <input
                            type="text"
                            required
                            autoFocus
                            value={mfaCode}
                            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-4 py-3 border border-stone-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-500 outline-none text-center tracking-widest text-lg font-mono"
                            placeholder="000000"
                            maxLength={6}
                          />
                        </div>

                        <div className="space-y-2 p-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/50 rounded-xl">
                          <p className="text-sm font-bold text-rose-600 dark:text-rose-400">⚠ Save these recovery codes!</p>
                          <p className="text-xs text-rose-500 dark:text-rose-300">You will not see them again. Use them to log in if you lose your device.</p>
                          <ul className="grid grid-cols-2 gap-1.5 text-xs font-mono bg-white dark:bg-stone-900 p-3 rounded-lg border border-rose-100 dark:border-stone-800">
                            {mfaEnrollment.recovery_codes.map((code) => (
                              <li key={code} className="text-stone-700 dark:text-stone-300">{code}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="flex justify-end gap-3 pt-1">
                          <button type="button" onClick={() => closeSecurityModal()} className="px-4 py-2 text-sm font-semibold rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors">Cancel</button>
                          <button type="submit" disabled={securityBusy || mfaCode.length < 6} className="px-5 py-2 text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-colors disabled:opacity-50 shadow-sm">Verify &amp; Enable</button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </SettingsModal>
          )}

          {securityModal === 'mfa-disable' && (
            <SettingsModal title="Disable Multi-Factor Authentication" onClose={closeSecurityModal}>
              <form onSubmit={handleDisableMfa} className="space-y-5">
                {securityError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">{securityError}</div>}
                
                <p className="text-sm text-stone-600 dark:text-stone-300">
                  Disabling MFA will make your account less secure. Please enter your password to confirm this action.
                </p>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      required
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 border border-stone-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-rose-500 outline-none"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPasswords(!showPasswords)}>
                      <Icon name={showPasswords ? 'eyeOff' : 'eye'} size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => closeSecurityModal()} className="px-4 py-2 text-sm font-semibold rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors">Cancel</button>
                  <button type="submit" disabled={securityBusy || !disablePassword} className="px-5 py-2 text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors disabled:opacity-50 shadow-sm">Disable MFA</button>
                </div>
              </form>
            </SettingsModal>
          )}

          {securityModal === 'password' && (
            <SettingsModal title="Update Password" onClose={closeSecurityModal}>
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                {securityError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">{securityError}</div>}
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      required
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 border border-stone-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-500 outline-none"
                      autoComplete="current-password"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPasswords(!showPasswords)}>
                      <Icon name={showPasswords ? 'eyeOff' : 'eye'} size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      required
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 border border-stone-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-500 outline-none"
                      autoComplete="new-password"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPasswords(!showPasswords)}>
                      <Icon name={showPasswords ? 'eyeOff' : 'eye'} size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-900 dark:text-stone-100">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      required
                      value={passwordForm.password_confirmation}
                      onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                      className="w-full px-4 py-2.5 pr-10 border border-stone-200 dark:border-stone-700 rounded-xl bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-brand-500 outline-none"
                      autoComplete="new-password"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPasswords(!showPasswords)}>
                      <Icon name={showPasswords ? 'eyeOff' : 'eye'} size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => closeSecurityModal()} className="px-4 py-2 text-sm font-semibold rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors">Cancel</button>
                  <button type="submit" disabled={securityBusy || !passwordForm.password} className="px-5 py-2 text-sm font-bold bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-100 rounded-xl transition-colors disabled:opacity-50 shadow-sm">Update Password</button>
                </div>
              </form>
            </SettingsModal>
          )}
        </div>
      </div>
    </div>
  );
}
