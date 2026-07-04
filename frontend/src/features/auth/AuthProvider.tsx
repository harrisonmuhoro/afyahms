import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { i18n, SUPPORTED_LOCALES } from '@/i18n';
import { httpClient, HttpError } from '@/lib/http';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  profile_photo_path: string | null;
  national_id: string | null;
  date_of_birth: string | null;
  staff_id: string | null;
  department: string | null;
  specialization: string | null;
  license_number: string | null;
  employment_type: string | null;
  employment_start_date: string | null;
  locale: string;
  theme: 'light' | 'dark';
  is_active: boolean;
  profile_complete: boolean;
  deactivated_at: string | null;
  deactivated_reason: string | null;
  mfa_enabled: boolean;
  home_branch: { id: number; code: string; name: string } | null;
  home_branch_id: number | null;
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
  mfa_type?: string | null;
  requires_mfa_enrollment: boolean;
  user: AuthUser;
  role?: string;
  profile_complete?: boolean;
  home_branch_id?: number | null;
}

interface MeResponse {
  user: AuthUser;
}

interface SwitchBranchResponse {
  user: AuthUser;
}

export interface PreferencesPayload {
  locale?: string;
  theme?: 'light' | 'dark';
}

interface PreferencesResponse {
  user: AuthUser;
}

interface MfaEnrollmentResponse {
  secret: string;
  qr_url: string;
  recovery_codes: string[];
  message: string;
}

interface ChangePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresMfa: boolean;
  requiresMfaEnrollment: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  switchBranch: (branchId: number) => Promise<AuthUser>;
  updatePreferences: (preferences: PreferencesPayload) => Promise<AuthUser>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  startMfaEnrollment: (type?: 'totp' | 'email') => Promise<MfaEnrollmentResponse>;
  verifyMfaEnrollment: (code: string) => Promise<AuthUser | null>;
  confirmMfa: (code: string) => Promise<AuthUser | null>;
  disableMfa: (currentPassword: string) => Promise<AuthUser | null>;
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
  const [requiresMfaEnrollment, setRequiresMfaEnrollment] = useState(false);

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
      setRequiresMfaEnrollment(false);
      return;
    }

    const userLocale = user.locale.split('-')[0];
    if (SUPPORTED_LOCALES.includes(userLocale) && i18n.language.split('-')[0] !== userLocale) {
      void i18n.changeLanguage(userLocale);
    }
  }, [user]);

  const login = useCallback<AuthContextValue['login']>(async (email, password) => {
    const response = await httpClient.post<LoginResponse>('/auth/login', { email, password });
    httpClient.setToken(response.token);
    setRequiresMfa(response.requires_mfa);
    setRequiresMfaEnrollment(response.requires_mfa_enrollment);
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
      setRequiresMfaEnrollment(false);
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

  const updatePreferences = useCallback<AuthContextValue['updatePreferences']>(async (preferences) => {
    const response = await httpClient.patch<PreferencesResponse>('/auth/preferences', preferences);
    await queryClient.setQueryData(['auth', 'me'], response.user);

    return response.user;
  }, [queryClient]);

  const changePassword = useCallback<AuthContextValue['changePassword']>(async (payload) => {
    await httpClient.post('/auth/password', payload);
  }, []);

  const startMfaEnrollment = useCallback<AuthContextValue['startMfaEnrollment']>(async (type = 'totp') => {
    return httpClient.post<MfaEnrollmentResponse>('/auth/mfa/enroll', { type });
  }, []);

  const verifyMfaEnrollment = useCallback<AuthContextValue['verifyMfaEnrollment']>(async (code) => {
    await httpClient.post('/auth/mfa/enroll/verify', { code });
    const fresh = await refetch();
    setRequiresMfaEnrollment(false);

    return fresh.data ?? null;
  }, [refetch]);

  const confirmMfa = useCallback<AuthContextValue['confirmMfa']>(async (code) => {
    await httpClient.post('/auth/mfa/confirm', { code });
    const fresh = await refetch();
    setRequiresMfa(false);

    return fresh.data ?? null;
  }, [refetch]);

  const disableMfa = useCallback<AuthContextValue['disableMfa']>(async (currentPassword) => {
    await httpClient.post('/auth/mfa/disable', { current_password: currentPassword });
    const fresh = await refetch();

    return fresh.data ?? null;
  }, [refetch]);

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
      requiresMfaEnrollment,
      hasPermission,
      hasAnyPermission,
      login,
      logout,
      refreshUser,
      switchBranch,
      updatePreferences,
      changePassword,
      startMfaEnrollment,
      verifyMfaEnrollment,
      confirmMfa,
      disableMfa,
      clearMfaRequirement,
    }),
    [
      user,
      isLoading,
      requiresMfa,
      hasPermission,
      hasAnyPermission,
      login,
      logout,
      refreshUser,
      switchBranch,
      updatePreferences,
      changePassword,
      startMfaEnrollment,
      verifyMfaEnrollment,
      disableMfa,
      clearMfaRequirement,
    ],
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
