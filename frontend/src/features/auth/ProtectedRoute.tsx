import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  anyPermission?: string[];
}

export function ProtectedRoute({ children, permission, anyPermission }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, isLoading, hasPermission, hasAnyPermission } = useAuth();
  const location = useLocation();

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

  if (permission !== undefined && !hasPermission(permission)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-stone-500">
        <p className="text-lg font-semibold text-stone-800 dark:text-stone-100">Access denied</p>
        <p className="text-sm">You do not have the required permission to view this page.</p>
      </div>
    );
  }

  if (anyPermission !== undefined && anyPermission.length > 0 && !hasAnyPermission(anyPermission)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-stone-500">
        <p className="text-lg font-semibold text-stone-800 dark:text-stone-100">Access denied</p>
        <p className="text-sm">You do not have the required permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}