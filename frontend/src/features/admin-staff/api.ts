import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '@/features/auth/AuthProvider';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';

interface PaginatedUsers {
  data: AuthUser[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface EmploymentPayload {
  name?: string;
  national_id?: string | null;
  date_of_birth?: string | null;
  staff_id?: string | null;
  department?: string | null;
  specialization?: string | null;
  license_number?: string | null;
  employment_type?: string | null;
  employment_start_date?: string | null;
}

export interface RolePayload {
  role: string;
  reason: string;
}

export function useAdminStaff(search: string): {
  staff: AuthUser[];
  isLoading: boolean;
  error: HttpError | null;
} {
  const query = useQuery({
    queryKey: ['admin', 'staff', search],
    queryFn: () =>
      httpClient.get<PaginatedUsers>('/admin/staff', {
        params: search.trim() !== '' ? { q: search.trim(), per_page: 50 } : { per_page: 50 },
      }),
    staleTime: 30_000,
  });

  return {
    staff: query.data?.data ?? [],
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

export function useUpdateStaffEmployment(): {
  mutateAsync: (input: { id: number; payload: EmploymentPayload }) => Promise<{ user: AuthUser }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: EmploymentPayload }) =>
      httpClient.patch<{ user: AuthUser }>(`/admin/staff/${id}/employment`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}

export function useUpdateStaffRole(): {
  mutateAsync: (input: { id: number; payload: RolePayload }) => Promise<{ user: AuthUser; message: string }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RolePayload }) =>
      httpClient.post<{ user: AuthUser; message: string }>(`/admin/staff/${id}/role`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}

export function useTriggerPasswordReset(): {
  mutateAsync: (id: number) => Promise<{ message: string; status: string }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const mutation = useMutation({
    mutationFn: (id: number) => httpClient.post<{ message: string; status: string }>(`/admin/staff/${id}/password-reset`),
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}

export function useSetStaffActiveState(): {
  mutateAsync: (input: { id: number; active: boolean; reason: string }) => Promise<{ user: AuthUser; message: string }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, active, reason }: { id: number; active: boolean; reason: string }) =>
      httpClient.post<{ user: AuthUser; message: string }>(`/users/${id}/${active ? 'reactivate' : 'deactivate'}`, { reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}

export interface CreateStaffPayload {
  name: string;
  email: string;
  phone?: string;
  role: string;
  home_branch_id: number;
}

export function useCreateStaff(): {
  mutateAsync: (payload: CreateStaffPayload) => Promise<{ user: AuthUser; message: string }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: CreateStaffPayload) =>
      httpClient.post<{ user: AuthUser; message: string }>('/admin/staff', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}

export interface UpdateBranchesPayload {
  branch_ids: number[];
  home_branch_id: number;
}

export function useUpdateStaffBranches(): {
  mutateAsync: (input: { id: number; payload: UpdateBranchesPayload }) => Promise<{ user: AuthUser; message: string }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateBranchesPayload }) =>
      httpClient.put<{ user: AuthUser; message: string }>(`/admin/staff/${id}/branches`, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}

export interface CreateAdminUserPayload {
  name: string;
  email: string;
  phone?: string;
  roles: Array<'superadmin' | 'hospital-admin'>;
  password: string;
}

export function useCreateAdminUser(): {
  mutateAsync: (payload: CreateAdminUserPayload) => Promise<{ user: AuthUser; message?: string }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: CreateAdminUserPayload) =>
      httpClient.post<{ user: AuthUser }>('/users', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'staff'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}
