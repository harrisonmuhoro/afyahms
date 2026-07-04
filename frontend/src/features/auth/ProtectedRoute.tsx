import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Single permission that is required. */
  permission?: string;
  /** Any one of these permissions is sufficient. */
  anyPermission?: string[];
}

export function ProtectedRoute({ children, permission, anyPermission }: ProtectedRouteProps): JSX.Element {
  const { user, isAuthenticated, isLoading, hasPermission, hasAnyPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation(['errors']);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-stone-500">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  const isPatient = user?.roles.includes('patient') ?? false;
  if (isPatient && user?.profile_complete === false && location.pathname !== '/patient/complete-profile') {
    return <Navigate to="/patient/complete-profile" replace />;
  }

  const denied =
    (permission !== undefined && !hasPermission(permission)) ||
    (anyPermission !== undefined && anyPermission.length > 0 && !hasAnyPermission(anyPermission));

  if (denied) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        {/* Lock icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <div>
          <p className="text-xl font-bold text-stone-800 dark:text-stone-100">
            {t('errors:access_denied_title')}
          </p>
          <p className="mt-1 max-w-sm text-sm text-stone-500 dark:text-stone-400">
            {t('errors:forbidden')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
        >
          ← Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
}