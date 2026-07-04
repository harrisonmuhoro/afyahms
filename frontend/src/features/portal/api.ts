import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { Patient } from '@/features/patients/types';

interface PortalMeResponse {
  patient: Patient;
}

interface PortalUpdateResponse {
  data: Patient;
}

export interface PortalDemographicsPayload {
  current_password: string;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  marital_status?: string | null;
  phone?: string | null;
  email?: string | null;
  county?: string | null;
  sub_county?: string | null;
  address?: string | null;
  occupation?: string | null;
  date_of_birth?: string | null;
  national_id?: string | null;
  guardian_name?: string | null;
  guardian_national_id?: string | null;
  guardian_relationship?: string | null;
}

export function usePortalPatient(): {
  patient: Patient | null;
  isLoading: boolean;
  error: HttpError | null;
} {
  const query = useQuery({
    queryKey: ['portal', 'me'],
    queryFn: () => httpClient.get<PortalMeResponse>('/portal/me'),
    staleTime: 60_000,
  });

  return {
    patient: query.data?.patient ?? null,
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

export function useUpdatePortalDemographics(): {
  mutateAsync: (payload: PortalDemographicsPayload) => Promise<PortalUpdateResponse>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: PortalDemographicsPayload) =>
      httpClient.patch<PortalUpdateResponse>('/portal/me/demographics', payload),
    onSuccess: (response) => {
      queryClient.setQueryData(['portal', 'me'], { patient: response.data });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'me'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}
