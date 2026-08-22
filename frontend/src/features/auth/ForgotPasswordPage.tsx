import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/icons/Icon';
import { HttpError } from '@/lib/http';
import { requestPasswordReset, verifyResetCode, resetPassword } from './forgotPasswordApi';

type Step = 'request' | 'verify' | 'reset' | 'success';

export function ForgotPasswordPage(): JSX.Element {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaData, setMfaData] = useState<{ required: boolean; type?: 'totp' | 'email' } | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: unknown) => {
    if (err instanceof HttpError) {
      const firstDetail = Object.values(err.details ?? {})[0]?.[0];
      setError(firstDetail ?? err.message);
    } else {
      setError('Something went wrong. Please try again.');
    }
  };

  const handleRequestSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await requestPasswordReset({ email });
      setMfaData({ required: response.mfa_required ?? false, type: response.mfa_type });
      setStep('verify');
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await verifyResetCode({ email, code });
      setResetToken(response.reset_token);
      setStep('reset');
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      setError('Passwords do not match');
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

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-stone-50 p-4 dark:bg-stone-950">
      <div className="w-full max-w-md animate-fade-in rounded-2xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/50">
            <Icon name="lock" size={24} className="text-teal-600 dark:text-teal-400" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">Reset Password</h1>
          <p className="mt-2 text-sm text-stone-500">
            {step === 'request' && "Enter your email to receive a reset code."}
            {step === 'verify' && mfaData?.type === 'email' && "An OTP has been sent to your email. Please enter it below."}
            {step === 'verify' && mfaData?.type === 'totp' && "Please enter the code from your Authenticator App."}
            {step === 'verify' && !mfaData?.required && "Please enter the code sent to your email."}
            {step === 'reset' && "Create a new password for your account."}
            {step === 'success' && "Your password has been successfully reset."}
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            <Icon name="close" size={16} className="mt-0.5 shrink-0 text-red-500" />
            {error}
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Email address</label>
              <input
                type="email"
                required
                className="input w-full"
                placeholder="you@hospital.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send code'}
            </button>
            <div className="text-center">
              <Link to="/login" className="text-sm font-medium text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">Back to login</Link>
            </div>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Verification Code</label>
              <input
                type="text"
                required
                className="input w-full text-center tracking-widest"
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify code'}
            </button>
            <div className="text-center">
              <button type="button" onClick={() => setStep('request')} className="text-sm font-medium text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">Cancel</button>
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={5}
                  className="input w-full pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={5}
                  className="input w-full pr-10"
                  placeholder="••••••••"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300" onClick={() => setShowPassword(!showPassword)}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={isLoading}>
              {isLoading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}

        {step === 'success' && (
          <div className="text-center">
            <Link to="/login" className="btn-primary inline-flex w-full justify-center">
              Go to login
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
