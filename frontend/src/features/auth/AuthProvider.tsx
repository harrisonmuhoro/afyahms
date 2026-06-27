import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient, HttpError } from '@/lib/http';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  mfa_enabled: boolean;
  home_branch: { id: number; code: string; name: string } | null;
  current_branch: { id: number; code: string; name: string } | null;
  branches: Array<{ id: number; code: string; name: string }>;
  roles: string[];
  permissions: string[];
  created_at: string | null;
  last_seen_at: string | null;
}

interface LoginResponse {
  token: string;
  requires_mfa: boolean;
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

interface SwitchBranchResponse {
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresMfa: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  switchBranch: (branchId: number) => Promise<AuthUser>;
  clearMfaRequirement: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe(): Promise<AuthUser | null> {
  const token = httpClient.getToken();
  if (token === null) {
    return null;
  }

  try {
    const response = await httpClient.get<MeResponse>('/auth/me');

    return response.user;
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) {
      httpClient.setToken(null);

      return null;
    }

    throw err;
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const queryClient = useQueryClient();
  const [requiresMfa, setRequiresMfa] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: false,
  });

  const user = data ?? null;

  useEffect(() => {
    if (user === null) {
      setRequiresMfa(false);
    }
  }, [user]);

  const login = useCallback<AuthContextValue['login']>(async (email, password) => {
    const response = await httpClient.post<LoginResponse>('/auth/login', { email, password });
    httpClient.setToken(response.token);
    setRequiresMfa(response.requires_mfa);
    await queryClient.setQueryData(['auth', 'me'], response.user);

    return response;
  }, [queryClient]);

  const logout = useCallback<AuthContextValue['logout']>(async () => {
    try {
      await httpClient.post('/auth/logout');
    } catch {
      // best-effort: even if the server call fails we still clear local state
    } finally {
      httpClient.setToken(null);
      setRequiresMfa(false);
      await queryClient.removeQueries({ queryKey: ['auth', 'me'] });
    }
  }, [queryClient]);

  const refreshUser = useCallback<AuthContextValue['refreshUser']>(async () => {
    const fresh = await refetch();
    return fresh.data ?? null;
  }, [refetch]);

  const switchBranch = useCallback<AuthContextValue['switchBranch']>(async (branchId) => {
    const response = await httpClient.post<SwitchBranchResponse>('/auth/branch/switch', { branch_id: branchId });
    await queryClient.setQueryData(['auth', 'me'], response.user);
    await queryClient.invalidateQueries();

    return response.user;
  }, [queryClient]);

  const hasPermission = useCallback<AuthContextValue['hasPermission']>((permission) => {
    if (user === null) {
      return false;
    }

    return user.permissions.includes(permission);
  }, [user]);

  const hasAnyPermission = useCallback<AuthContextValue['hasAnyPermission']>((permissions) => {
    if (user === null) {
      return false;
    }

    return permissions.some((permission) => user.permissions.includes(permission));
  }, [user]);

  const clearMfaRequirement = useCallback(() => {
    setRequiresMfa(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      requiresMfa,
      hasPermission,
      hasAnyPermission,
      login,
      logout,
      refreshUser,
      switchBranch,
      clearMfaRequirement,
    }),
    [user, isLoading, requiresMfa, hasPermission, hasAnyPermission, login, logout, refreshUser, switchBranch, clearMfaRequirement],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return ctx;
}