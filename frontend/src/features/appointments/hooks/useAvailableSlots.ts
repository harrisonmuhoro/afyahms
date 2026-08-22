import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { AvailableSlot } from '../types';

interface UseSlotsArgs {
  doctor_id: string;
  branch_id: string;
  schedule_id?: string;
  date: string; // YYYY-MM-DD
}

export function useAvailableSlots(
  args: UseSlotsArgs,
  enabled = true,
  endpoint = '/appointments/slots',
): {
  slots: AvailableSlot[];
  isLoading: boolean;
  error: HttpError | null;
} {
  const query = useQuery({
    queryKey: ['slots', 'available', endpoint, args],
    queryFn: async () => {
      const res = await httpClient.get<{ data: AvailableSlot[] }>(endpoint, {
        params: {
          doctor_id: args.doctor_id,
          branch_id: args.branch_id,
          schedule_id: args.schedule_id,
          date: args.date,
        },
      });
      return res.data;
    },
    enabled: enabled && !!args.doctor_id && !!args.branch_id && !!args.date,
    staleTime: 30_000, // 30s — slots change fast
  });

  return {
    slots: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}
