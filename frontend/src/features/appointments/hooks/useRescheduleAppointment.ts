import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { Appointment } from '../types';

export interface ReschedulePayload {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  schedule_id: string;
  reason?: string;
}

export function useRescheduleAppointment(): {
  mutateAsync: (payload: ReschedulePayload) => Promise<Appointment>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, ...body }: ReschedulePayload) => {
      const res = await httpClient.patch<{ message: string; appointment: Appointment }>(
        `/appointments/${id}/reschedule`,
        body,
      );
      return res.appointment;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: (mutation.error as HttpError | null) ?? null,
  };
}
