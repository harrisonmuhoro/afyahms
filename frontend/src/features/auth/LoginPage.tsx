import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { HttpError } from '@/lib/http';
import { resolveHomeRoute } from '@/config/navigation';
import { Icon, type IconName } from '@/components/icons/Icon';
import { GoogleSignInButton } from './GoogleSignInButton';

interface LocationState {
  from?: string;
}

/* ─── Feature bullet item (brand panel) ─────────────────────────────────────── */
function Feature({ icon, text }: { icon: IconName; text: string }): JSX.Element {
  return (
    <li className="flex items-center gap-4 text-white/90">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
        <Icon name={icon} size={20} className="text-brand-200" />
      </span>
      <span className="text-sm font-medium">{text}</span>
    </li>
  );
}

export function LoginPage(): JSX.Element {
  const { t, i18n } = useTranslation(['auth', 'errors', 'common', 'app', 'settings']);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, confirmMfa } = useAuth();

  const [email, setEmail] = useState('admin@afya.local');
  const [password, setPassword] = useState('ChangeMe!2025');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
    <div className="flex min-h-screen overflow-hidden bg-stone-50 dark:bg-stone-950">
      {/* ── Left panel (~45%): brand & marketing ────────────────────────── */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 to-brand-950 p-10 lg:flex lg:w-[45%]">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-[size:40px_40px]" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-black/20 blur-[100px]" />

        {/* Brand identity */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 shadow-sm">
            <Icon name="heartPulse" size={24} className="text-brand-700" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">{t('app:name')}</span>
        </div>

        {/* Messaging */}
        <div className="relative z-10 mb-auto mt-auto max-w-md">
          <h1 className="mb-8 text-[40px] font-semibold leading-tight tracking-tight text-white text-balance">
            Hospital Management,
            <br />
            Simplified.
          </h1>
          <ul className="space-y-4">
            <Feature icon="branches" text="Multi-branch Coordination" />
            <Feature icon="reports" text="Real-time Clinical Insights" />
            <Feature icon="shield" text="Secure Patient Records" />
          </ul>
        </div>

        {/* Copyright */}
        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} {t('app:name')}. All rights reserved.
        </p>
      </section>

      {/* ── Right panel (~55%): login form ──────────────────────────────── */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="mb-8 flex flex-col items-center text-center lg:hidden">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900">
            <Icon name="heartPulse" size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-brand-700 dark:text-brand-300">{t('app:name')}</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{t('app:tagline')}</p>
        </div>

        <div className="w-full max-w-[400px] animate-fade-in">
          {/* Welcome section */}
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              {t('auth:login.title', 'Welcome back')}
            </h2>
            <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
              {t('auth:login.subtitle', 'Please enter your details to sign in.')}
            </p>
          </div>

          {mfaStep === 'none' ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-stone-700 dark:text-stone-300"
                >
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
                    className="input pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-stone-700 dark:text-stone-300"
                  >
                    {t('auth:login.password', 'Password')}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
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
                    className="input pl-10 pr-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-stone-300 text-brand-600
                             focus:ring-brand-500/30 dark:border-stone-600 dark:bg-stone-800"
                />
                <label
                  htmlFor="remember"
                  className="cursor-pointer text-sm text-stone-500 dark:text-stone-400"
                >
                  Remember me for 30 days
                </label>
              </div>

              {/* Error */}
              {error !== null && (
                <div
                  role="alert"
                  className="animate-shake flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
                >
                  <Icon name="alertCircle" size={15} className="mt-0.5 shrink-0 text-red-500" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" id="login-submit" className="btn-login" disabled={submitting}>
                {submitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    {t('auth:login.submitting', 'Signing in…')}
                  </>
                ) : (
                  t('auth:login.submit', 'Sign In')
                )}
              </button>

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center" aria-hidden>
                  <div className="w-full border-t border-stone-200 dark:border-stone-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-stone-50 px-3 text-sm text-stone-500 dark:bg-stone-950 dark:text-stone-400">
                    Or sign in with
                  </span>
                </div>
              </div>

              {/* Social sign-in */}
              <GoogleSignInButton />
            </form>
          ) : (
            <form onSubmit={handleMfaVerify} noValidate className="animate-fade-in space-y-5">
              <div className="mb-4">
                <h2 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                  {t('auth:mfa.title', 'Two-factor verification')}
                </h2>
                <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
                  {t('auth:mfa.subtitle', 'Enter the 6-digit code from your authenticator app')}
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="mfaCode"
                  className="block text-sm font-semibold text-stone-700 dark:text-stone-300"
                >
                  {t('auth:mfa.code', 'Authentication Code')}
                </label>
                <input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  placeholder="123456"
                  className="input text-center font-mono text-lg tracking-[0.5em]"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>

              {error !== null && (
                <div
                  role="alert"
                  className="animate-shake flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400"
                >
                  <Icon name="alertCircle" size={15} className="mt-0.5 shrink-0 text-red-500" />
                  {error}
                </div>
              )}

              <button type="submit" className="btn-login" disabled={submitting || mfaCode.length < 6}>
                {submitting ? 'Verifying…' : 'Verify & Continue'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMfaStep('none');
                  setError(null);
                  setMfaCode('');
                }}
                className="mt-2 w-full py-2 text-sm text-stone-500 transition-colors hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-300"
                disabled={submitting}
              >
                Cancel and return to login
              </button>
            </form>
          )}

          {/* Demo hint */}
          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900/50">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
              Demo credentials
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {t('auth:login.demo', 'Use any role email from the README · Password: ChangeMe!2025')}
            </p>
          </div>

          {/* Footer: language switcher + tagline */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-stone-200/70 pt-5 dark:border-stone-800/70 sm:flex-row">
            <div className="flex items-center gap-4 text-sm text-stone-500 dark:text-stone-400">
              <button
                type="button"
                onClick={() => void i18n.changeLanguage('en')}
                aria-pressed={i18n.language === 'en'}
                className={`transition-colors hover:text-brand-600 dark:hover:text-brand-400 ${
                  i18n.language === 'en' ? 'font-semibold text-brand-700 dark:text-brand-300' : ''
                }`}
              >
                {t('settings:language.english', 'English')}
              </button>
              <button
                type="button"
                onClick={() => void i18n.changeLanguage('sw')}
                aria-pressed={i18n.language === 'sw'}
                className={`transition-colors hover:text-brand-600 dark:hover:text-brand-400 ${
                  i18n.language === 'sw' ? 'font-semibold text-brand-700 dark:text-brand-300' : ''
                }`}
              >
                {t('settings:language.swahili', 'Swahili')}
              </button>
            </div>
            <span className="text-xs text-stone-400 dark:text-stone-500">{t('app:tagline')}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
