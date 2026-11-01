import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { PaginatedPatients, Patient, PatientAllergy, PatientSearchHit } from './types';

interface ListPatientsArgs {
  page?: number;
  perPage?: number;
  search?: string;
  gender?: 'male' | 'female' | 'other';
  bloodGroup?: string;
  isActive?: boolean;
}

export function usePatients(args: ListPatientsArgs = {}): {
  data: Patient[];
  pagination: PaginatedPatients['meta']['pagination'] | null;
  isLoading: boolean;
  error: HttpError | null;
} {
  const { page = 1, perPage = 25, search, gender, bloodGroup, isActive } = args;

  const query = useQuery({
    queryKey: ['patients', 'list', { page, perPage, search, gender, bloodGroup, isActive }],
    queryFn: async () => {
      const response = await httpClient.get<PaginatedPatients | { data: Patient[] }>('/patients', {
        params: {
          page,
          per_page: perPage,
          ...(search !== undefined && search !== '' ? { search } : {}),
          ...(gender !== undefined ? { gender } : {}),
          ...(bloodGroup !== undefined ? { blood_group: bloodGroup } : {}),
          ...(isActive !== undefined ? { is_active: String(isActive) } : {}),
        },
      });

      // Response is either a paginated resource collection (with data + meta)
      // or a bare { data: Patient[] }.
      if ('meta' in response) {
        return response;
      }
      return {
        data: response.data,
        meta: {
          pagination: {
            mode: 'page' as const,
            current_page: page,
            per_page: perPage,
            total: response.data.length,
            last_page: 1,
            from: response.data.length > 0 ? 1 : null,
            to: response.data.length > 0 ? response.data.length : null,
          },
        },
      };
    },
    staleTime: 30_000,
  });

  const payload = query.data;
  return {
    data: payload?.data ?? [],
    pagination: payload?.meta.pagination ?? null,
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

export function usePatient(uuid: string | undefined): {
  patient: Patient | null;
  isLoading: boolean;
  error: HttpError | null;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: ['patients', 'detail', uuid],
    queryFn: async () => {
      if (uuid === undefined) {
        return null;
      }
      // PatientResource wraps in { data: Patient }
      const res = await httpClient.get<{ data: Patient }>(`/patients/${uuid}`);
      return res.data;
    },
    enabled: uuid !== undefined,
    staleTime: 60_000,
  });

  return {
    patient: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
    refetch: () => { void query.refetch(); },
  };
}

export function usePatientSearch(query: string, limit = 10): {
  hits: PatientSearchHit[];
  isLoading: boolean;
} {
  const trimmed = query.trim();
  const search = useQuery({
    queryKey: ['patients', 'search', trimmed, limit],
    queryFn: async () => {
      if (trimmed === '') {
        return [] as PatientSearchHit[];
      }
      const response = await httpClient.get<{ data: PatientSearchHit[] }>('/patients/search', {
        params: { q: trimmed, limit },
      });

      return response.data;
    },
    enabled: trimmed.length >= 2,
    staleTime: 10_000,
  });

  return {
    hits: search.data ?? [],
    isLoading: search.isFetching,
  };
}

interface CreatePatientInput {
  first_name: string;
  last_name: string;
  gender: 'male' | 'female' | 'other';
  date_of_birth: string;
  phone: string;
  middle_name?: string;
  email?: string;
  national_id?: string;
  sha_number?: string;
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  county?: string;
  address?: string;
  dedupe_override?: boolean;
}

interface CreatePatientResponse {
  data: Patient;
}

export function useCreatePatient(): {
  mutate: (input: CreatePatientInput) => void;
  mutateAsync: (input: CreatePatientInput) => Promise<CreatePatientResponse>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: CreatePatientInput) => {
      return await httpClient.post<CreatePatientResponse>('/patients', input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patients', 'list'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: (mutation.error as HttpError | null) ?? null,
  };
}

interface UpdatePatientInput {
  uuid: string;
  attributes: Partial<CreatePatientInput>;
}

export function useUpdatePatient(): {
  mutate: (input: UpdatePatientInput) => void;
  mutateAsync: (input: UpdatePatientInput) => Promise<{ data: Patient }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ uuid, attributes }: UpdatePatientInput) => {
      return await httpClient.patch<{ data: Patient }>(`/patients/${uuid}`, attributes);
    },
    onSuccess: (_response, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['patients', 'detail', variables.uuid] });
      void queryClient.invalidateQueries({ queryKey: ['patients', 'list'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: (mutation.error as HttpError | null) ?? null,
  };
}

export function useDeletePatient(): {
  mutate: (uuid: string) => void;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (uuid: string) => {
      return await httpClient.delete<{ message: string }>(`/patients/${uuid}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patients', 'list'] });
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    error: (mutation.error as HttpError | null) ?? null,
  };
}

/** Recorded allergies for a patient (GET /patients/{uuid}/allergies). */
export function usePatientAllergies(uuid: string | undefined, enabled = true): {
  allergies: PatientAllergy[];
  isLoading: boolean;
  error: unknown;
} {
  const query = useQuery({
    queryKey: ['patients', uuid, 'allergies'],
    queryFn: async () => {
      const response = await httpClient.get<{ data: PatientAllergy[] } | PatientAllergy[]>(`/patients/${uuid}/allergies`);
      return Array.isArray(response) ? response : response.data;
    },
    enabled: enabled && uuid !== undefined,
    staleTime: 60_000,
  });

  return {
    allergies: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
