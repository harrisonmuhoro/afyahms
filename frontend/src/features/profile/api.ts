import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@/features/auth/AuthProvider';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';

interface EmploymentInfo {
  roles: string[];
  department: string | null;
  employee_number: string | null;
  branch: { id: number; code: string; name: string } | null;
  account_status: 'active' | 'inactive';
}

interface PendingContactChange {
  field: 'email' | 'phone';
  new_value: string;
  expires_at: string | null;
}

export interface StaffProfileResponse {
  user: AuthUser;
  employment: EmploymentInfo;
  pending_contact_changes: PendingContactChange[];
}

export interface BasicProfilePayload {
  current_password: string;
  name?: string;
  phone?: string | null;
  address?: string | null;
  next_of_kin_name?: string | null;
  next_of_kin_phone?: string | null;
  locale?: string;
}

export interface ContactChangePayload {
  current_password: string;
  field: 'email' | 'phone';
  new_value: string;
}

interface ContactChangeResponse {
  message: string;
  field: 'email' | 'phone';
  expires_at: string | null;
  debug_verification_token?: string;
}

export interface VerifyContactPayload {
  field: 'email' | 'phone';
  token: string;
}

export interface PasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export function useStaffProfile(): {
  profile: StaffProfileResponse | null;
  isLoading: boolean;
  error: HttpError | null;
} {
  const query = useQuery({
    queryKey: ['staff', 'profile'],
    queryFn: () => httpClient.get<StaffProfileResponse>('/staff/profile'),
    staleTime: 60_000,
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

export function useUpdateBasicProfile(): {
  mutateAsync: (payload: BasicProfilePayload) => Promise<{ user: AuthUser; updated_at: string }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: BasicProfilePayload) =>
      httpClient.patch<{ user: AuthUser; updated_at: string }>('/staff/profile/basic', payload),
    onSuccess: (response) => {
      queryClient.setQueryData(['auth', 'me'], response.user);
      void queryClient.invalidateQueries({ queryKey: ['staff', 'profile'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}

export function useRequestContactChange(): {
  mutateAsync: (payload: ContactChangePayload) => Promise<ContactChangeResponse>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: ContactChangePayload) =>
      httpClient.patch<ContactChangeResponse>('/staff/profile/contact', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['staff', 'profile'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}

export function useVerifyContactChange(): {
  mutateAsync: (payload: VerifyContactPayload) => Promise<{ user: AuthUser; message: string }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: VerifyContactPayload) =>
      httpClient.post<{ user: AuthUser; message: string }>('/staff/profile/contact/verify', payload),
    onSuccess: (response) => {
      queryClient.setQueryData(['auth', 'me'], response.user);
      void queryClient.invalidateQueries({ queryKey: ['staff', 'profile'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}

export function useUpdateStaffPassword(): {
  mutateAsync: (payload: PasswordPayload) => Promise<{ message: string }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const mutation = useMutation({
    mutationFn: (payload: PasswordPayload) =>
      httpClient.patch<{ message: string }>('/staff/profile/password', payload),
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}

export function useUploadProfilePhoto(): {
  mutateAsync: (file: File) => Promise<{ user: AuthUser; message: string }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (file: File) => httpClient.upload<{ user: AuthUser; message: string }>('/staff/profile/photo', file),
    onSuccess: (response) => {
      queryClient.setQueryData(['auth', 'me'], response.user);
      void queryClient.invalidateQueries({ queryKey: ['staff', 'profile'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}
