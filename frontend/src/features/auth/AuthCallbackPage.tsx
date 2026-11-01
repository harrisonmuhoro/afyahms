import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { httpClient } from '@/lib/http';
import { resolveHomeRoute } from '@/config/navigation';

export function AuthCallbackPage(): JSX.Element {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const code = new URLSearchParams(window.location.hash.slice(1)).get('code');
    if (!code) {
      navigate('/login', { replace: true });
      return;
    }

    window.history.replaceState({}, '', window.location.pathname);

    httpClient.post<{ token: string }>('/auth/google/exchange', { code }).then(({ token }) => {
      httpClient.setToken(token);
      return refreshUser();
    }).then((user) => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      navigate(resolveHomeRoute(user.roles), { replace: true });
    }).catch(() => {
      navigate('/login', { replace: true });
    });
  }, [navigate, refreshUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950">
      <div className="flex flex-col items-center">
        <svg className="mb-4 h-8 w-8 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Authenticating securely…</p>
      </div>
    </div>
  );
}
