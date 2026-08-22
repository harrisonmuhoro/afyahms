import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { Appointment, BookAppointmentPayload } from '../types';

export function useBookAppointment(): {
  mutateAsync: (payload: BookAppointmentPayload) => Promise<Appointment>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: BookAppointmentPayload) => {
      const res = await httpClient.post<{ data: Appointment }>('/appointments', payload);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      void queryClient.invalidateQueries({
        queryKey: ['slots', 'available', {
          doctor_id: variables.doctor_id ?? '',
          date: variables.appointment_date,
          branch_id: variables.branch_id,
        }],
      });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: (mutation.error as HttpError | null) ?? null,
  };
}
