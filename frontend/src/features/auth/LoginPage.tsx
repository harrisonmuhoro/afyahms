import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { HttpError } from '@/lib/http';
import { resolveHomeRoute } from '@/config/navigation';
import { Icon } from '@/components/icons/Icon';
import { GoogleSignInButton } from './GoogleSignInButton';

interface LocationState {
  from?: string;
}

/* ─── Decorative SVG illustration ──────────────────────────────────────────── */
function MedicalIllustration(): JSX.Element {
  return (
    <svg
      viewBox="0 0 320 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-xs animate-float opacity-90"
      aria-hidden
    >
      {/* Monitor / screen */}
      <rect x="60" y="60" width="200" height="130" rx="12" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      <rect x="60" y="60" width="200" height="28" rx="12" fill="rgba(255,255,255,0.18)" />
      {/* Traffic-light dots */}
      <circle cx="78" cy="74" r="4.5" fill="rgba(255,255,255,0.5)" />
      <circle cx="92" cy="74" r="4.5" fill="rgba(255,255,255,0.35)" />
      <circle cx="106" cy="74" r="4.5" fill="rgba(255,255,255,0.20)" />
      {/* ECG / heart-rate line */}
      <polyline
        points="78,130  98,130  108,105  118,155  128,118  138,142  148,130  222,130"
        stroke="rgba(110,231,183,0.85)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Heart icon */}
      <path
        d="M160 102 C160 102 148 93 143 98 C138 103 141 111 148 116 L160 127 L172 116 C179 111 182 103 177 98 C172 93 160 102 160 102Z"
        fill="rgba(110,231,183,0.60)"
      />
      {/* Stand + base */}
      <rect x="150" y="190" width="20" height="20" rx="3" fill="rgba(255,255,255,0.15)" />
      <rect x="120" y="208" width="80" height="10" rx="5" fill="rgba(255,255,255,0.10)" />
      {/* Pill capsule left */}
      <rect x="30" y="170" width="36" height="16" rx="8" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <rect x="30" y="170" width="18" height="16" rx="8" fill="rgba(110,231,183,0.35)" />
      {/* Pill capsule right */}
      <rect x="254" y="100" width="36" height="16" rx="8" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <rect x="254" y="100" width="18" height="16" rx="8" fill="rgba(110,231,183,0.35)" />
      {/* Cross / plus symbol */}
      <rect x="34" y="110" width="8" height="28" rx="2" fill="rgba(255,255,255,0.30)" />
      <rect x="26" y="118" width="24" height="8" rx="2" fill="rgba(255,255,255,0.30)" />
      {/* Small circle accents */}
      <circle cx="270" cy="170" r="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <circle cx="50" cy="60" r="6" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
    </svg>
  );
}

/* ─── Feature bullet item ───────────────────────────────────────────────────── */
function Feature({ icon, text }: { icon: React.ReactNode; text: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-teal-200">
        {icon}
      </span>
      <span className="text-sm font-medium text-teal-50">{text}</span>
    </div>
  );
}

export function LoginPage(): JSX.Element {
  const { t } = useTranslation(['auth', 'errors', 'common', 'app']);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, confirmMfa } = useAuth();

  const [email, setEmail] = useState('admin@afya.local');
  const [password, setPassword] = useState('ChangeMe!2025');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MFA Flow States
  const [mfaStep, setMfaStep] = useState<'none' | 'verify'>('none');
  const [mfaCode, setMfaCode] = useState('');
  // We need to keep track of the destination after MFA succeeds
  const [pendingDestination, setPendingDestination] = useState<string | null>(null);

  const from = (location.state as LocationState | null)?.from;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await login(email, password);
      const destination = from ?? resolveHomeRoute(response.user.roles);
      
      if (response.requires_mfa) {
        setPendingDestination(destination);
        setMfaStep('verify');
      } else {
        navigate(destination, { replace: true });
      }
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) {
        setError(t('errors:unauthorized', 'Invalid credentials. Please check your email and password.'));
      } else if (err instanceof HttpError && err.status === 403) {
        setError(err.message || t('errors:forbidden', "Your role isn't permitted to do this."));
      } else if (err instanceof HttpError) {
        setError(err.message || t('errors:generic'));
      } else {
        setError(t('errors:generic'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMfaVerify = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await confirmMfa(mfaCode);
      
      if (pendingDestination) {
        navigate(pendingDestination, { replace: true });
      }
    } catch (err) {
      if (err instanceof HttpError && err.status === 403) {
        setError('Invalid authentication code. Please try again.');
      } else if (err instanceof HttpError) {
        setError(err.message || t('errors:generic'));
      } else {
        setError(t('errors:generic'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full overflow-hidden bg-stone-50 dark:bg-stone-950">
      {/* ── Left panel: brand + illustration ───────────────────────────── */}
      <div className="login-left-panel relative hidden flex-col justify-between overflow-hidden p-10 lg:flex lg:w-[55%]">
        {/* Background radial glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-10 h-80 w-80 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-600/10 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon name="heartPulse" size={22} className="text-teal-200" />
          </div>
          <div>
            <span className="block text-lg font-bold text-white">{t('app:name')}</span>
            <span className="block text-[11px] font-medium tracking-wider text-teal-300/80 uppercase">
              Clinical Platform
            </span>
          </div>
        </div>

        {/* Illustration + headline */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <MedicalIllustration />
          <h2 className="mt-6 text-3xl font-bold leading-tight text-white text-balance">
            Empowering Every<br />
            <span className="text-teal-300">Care Decision</span>
          </h2>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-teal-100/75">
            Integrated queue management, EMR, pharmacy, lab, billing and real-time
            patient journey — all in one secure platform.
          </p>
        </div>

        {/* Feature bullets */}
        <div className="relative z-10 space-y-3">
          <Feature
            icon={<Icon name="user" size={16} />}
            text="Role-scoped dashboards for every department"
          />
          <Feature
            icon={<Icon name="queue" size={16} />}
            text="Real-time queue & triage management"
          />
          <Feature
            icon={<Icon name="emr" size={16} />}
            text="SOAP clinical notes with ICD-10 coding"
          />
          <Feature
            icon={<Icon name="audit" size={16} />}
            text="RBAC permissions + full audit trail"
          />
        </div>
      </div>

      {/* ── Right panel: login form ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center text-center lg:hidden">
          <div className="login-left-panel mb-3 flex h-14 w-14 items-center justify-center rounded-2xl">
            <Icon name="heartPulse" size={26} className="text-teal-200" />
          </div>
          <h1 className="text-2xl font-bold text-brand-700 dark:text-brand-300">{t('app:name')}</h1>
          <p className="mt-1 text-sm text-stone-500">{t('app:tagline')}</p>
        </div>

        {/* Form card */}
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">
              {t('auth:login.title', 'Welcome back')}
            </h1>
            <p className="mt-1.5 text-sm text-stone-500">
              {t('auth:login.subtitle', 'Sign in to access your clinical workspace.')}
            </p>
          </div>

          {mfaStep === 'none' ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  {t('auth:login.email', 'Email address')}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
                    <Icon name="mail" size={16} />
                  </span>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="you@hospital.com"
                    className="input-login pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                    {t('auth:login.password', 'Password')}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-teal-600 hover:text-teal-500 dark:text-teal-400 dark:hover:text-teal-300"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
                    <Icon name="lock" size={16} />
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="input-login pl-10 pr-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-stone-400 transition-colors hover:text-stone-600"
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                  </button>
                </div>
              </div>

              {/* Error */}
              {error !== null && (
                <div
                  role="alert"
                  className="animate-shake flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
                >
                  <Icon name="close" size={15} className="mt-0.5 shrink-0 text-red-500" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                id="login-submit"
                className="btn-login"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    {t('auth:login.submitting', 'Signing in…')}
                  </>
                ) : (
                  t('auth:login.submit', 'Sign in')
                )}
              </button>

              {/* Patient Access Section */}
              <div className="mt-8 pt-6 border-t border-stone-200 dark:border-stone-800">
                <div className="relative flex items-center justify-center mb-6">
                  <span className="absolute bg-stone-50 dark:bg-stone-950 px-2 text-sm text-stone-500 font-medium">
                    Are you a patient?
                  </span>
                </div>
                <div className="space-y-3">
                  <GoogleSignInButton />
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMfaVerify} noValidate className="space-y-5 animate-fade-in">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-stone-900 dark:text-stone-50">
                  Two-Factor Authentication
                </h2>
                <p className="mt-1.5 text-sm text-stone-500">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="mfaCode" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Authentication Code
                </label>
                <input
                  id="mfaCode"
                  type="text"
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="input-login text-center tracking-widest text-lg font-mono"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>

              {error !== null && (
                <div
                  role="alert"
                  className="animate-shake flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
                >
                  <Icon name="close" size={15} className="mt-0.5 shrink-0 text-red-500" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-login"
                disabled={submitting || mfaCode.length < 6}
              >
                {submitting ? 'Verifying…' : 'Verify & Continue'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setMfaStep('none');
                  setError(null);
                  setMfaCode('');
                }}
                className="w-full mt-2 py-2 text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                disabled={submitting}
              >
                Cancel and return to login
              </button>
            </form>
          )}

          {/* Demo hint */}
          <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900/50">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">Demo credentials</p>
            <p className="text-xs text-stone-500">
              {t('auth:login.demo', 'Use any role email from the README · Password: ChangeMe!2025')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
