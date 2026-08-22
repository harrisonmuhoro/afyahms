import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';

interface CancelPayload {
  id: string;
  reason: string;
}

export function useCancelAppointment(): {
  mutateAsync: (payload: CancelPayload) => Promise<void>;
  isPending: boolean;
  error: HttpError | null;
} {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ id, reason }: CancelPayload) => {
      await httpClient.patch<{ message: string }>(`/appointments/${id}/cancel`, { reason });
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
