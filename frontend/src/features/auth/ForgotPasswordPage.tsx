import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { HttpError } from '@/lib/http';
import { requestPasswordReset, resetPassword } from './forgotPasswordApi';

type Step = 'request' | 'sent' | 'reset' | 'success';

function readResetLink(): { email: string; token: string } {
  const params = new URLSearchParams(window.location.hash.slice(1));
  return {
    email: params.get('email') ?? '',
    token: params.get('token') ?? '',
  };
}

export function ForgotPasswordPage(): JSX.Element {
  const [resetLink] = useState(readResetLink);
  const [step, setStep] = useState<Step>(() => resetLink.email && resetLink.token ? 'reset' : 'request');
  const [email, setEmail] = useState(resetLink.email);
  const [resetToken, setResetToken] = useState(resetLink.token);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resetLink.token) {
      // Keep the one-time token out of browser history and later referrers.
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  }, [resetLink.token]);

  const handleError = (err: unknown) => {
    if (err instanceof HttpError) {
      const firstDetail = Object.values(err.details ?? {})[0]?.[0];
      setError(firstDetail ?? err.message);
    } else {
      setError('Something went wrong. Please try again.');
    }
  };

  const handleRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await requestPasswordReset({ email });
      setStep('sent');
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== passwordConfirmation) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await resetPassword({ email, reset_token: resetToken, password, password_confirmation: passwordConfirmation });
      setStep('success');
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const returnToRequest = () => {
    setError(null);
    setResetToken('');
    setPassword('');
    setPasswordConfirmation('');
    setStep('request');
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-stone-50 p-4 dark:bg-stone-950">
      <div className="w-full max-w-md animate-fade-in rounded-2xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/50">
            <Icon name="lock" size={24} className="text-teal-600 dark:text-teal-400" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Reset Password</h1>
          <p className="mt-2 text-sm text-stone-500">
            {step === 'request' && 'Enter your email and we will send you a password reset link.'}
            {step === 'sent' && 'If an active account exists for that email, a reset link is on its way. It expires in 15 minutes.'}
            {step === 'reset' && 'Choose a new password. This reset link expires 15 minutes after it was requested and works once.'}
            {step === 'success' && 'Your password has been reset successfully.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-6 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            <Icon name="close" size={16} className="mt-0.5 shrink-0 text-red-500" />
            {error}
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="block text-sm font-medium text-stone-700 dark:text-stone-300">Email address</label>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                className="input w-full"
                placeholder="you@hospital.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send reset link'}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-sm font-medium text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">Back to login</Link>
            </div>
          </form>
        )}

        {step === 'sent' && (
          <div className="space-y-4 text-center">
            <button type="button" onClick={returnToRequest} className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400">
              Try another email address
            </button>
            <Link to="/login" className="btn-primary inline-flex w-full justify-center">Back to login</Link>
          </div>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-sm font-medium text-stone-700 dark:text-stone-300">New Password</label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  className="input w-full pr-10"
                  placeholder="At least 12 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-stone-700 dark:text-stone-300">Confirm New Password</label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={12}
                className="input w-full"
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={isLoading}>
              {isLoading ? 'Resetting...' : 'Reset password'}
            </button>
            <button type="button" onClick={returnToRequest} className="w-full text-sm font-medium text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">
              Request a new reset link
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="text-center">
            <Link to="/login" className="btn-primary inline-flex w-full justify-center">Go to login</Link>
          </div>
        )}
      </div>
    </div>
  );
}
