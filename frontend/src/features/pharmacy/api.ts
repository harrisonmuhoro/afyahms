import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { Medication, Prescription } from './types';

export function useMedications() {
  const query = useQuery({
    queryKey: ['pharmacy', 'medications'],
    queryFn: async () => {
      const res = await httpClient.get<Medication[]>('/pharmacy/medications');
      return res;
    },
    staleTime: 30_000,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

export function usePrescriptions() {
  const query = useQuery({
    queryKey: ['pharmacy', 'prescriptions'],
    queryFn: async () => {
      const res = await httpClient.get<Prescription[]>('/pharmacy/prescriptions');
      return res;
    },
    staleTime: 30_000,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

export function useUpdatePrescriptionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'pending' | 'dispensed' | 'cancelled' }) => {
      const res = await httpClient.put<Prescription>(`/pharmacy/prescriptions/${id}/status`, { status });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'medications'] });
    },
  });
}
