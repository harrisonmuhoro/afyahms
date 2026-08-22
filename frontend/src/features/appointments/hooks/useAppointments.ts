import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { Appointment } from '../types';

interface ListAppointmentsArgs {
  branch_id?: string;
  doctor_id?: string;
  patient_id?: string;
  status?: string;
  date?: string;
  from?: string;
  to?: string;
  type?: string;
  booked_via?: string;
  per_page?: number;
  page?: number;
}

interface AppointmentsResponse {
  data: Appointment[];
  meta?: {
    pagination?: {
      current_page: number;
      last_page: number;
      total: number;
      per_page: number;
      from: number | null;
      to: number | null;
    };
  };
}

export function useAppointments(args: ListAppointmentsArgs = {}): {
  appointments: Appointment[];
  pagination: NonNullable<AppointmentsResponse['meta']>['pagination'] | null;
  isLoading: boolean;
  error: HttpError | null;
  refetch: () => void;
} {
  const params: Record<string, string> = {};
  if (args.branch_id) params.branch_id = args.branch_id;
  if (args.doctor_id) params.doctor_id = args.doctor_id;
  if (args.patient_id) params.patient_id = args.patient_id;
  if (args.status) params.status = args.status;
  if (args.date) params.date = args.date;
  if (args.from) params.from = args.from;
  if (args.to) params.to = args.to;
  if (args.type) params.type = args.type;
  if (args.booked_via) params.booked_via = args.booked_via;
  if (args.per_page) params.per_page = String(args.per_page);
  if (args.page) params.page = String(args.page);

  const query = useQuery({
    queryKey: ['appointments', 'list', args],
    queryFn: async () => {
      const res = await httpClient.get<AppointmentsResponse>('/appointments', { params });
      return res;
    },
    staleTime: 30_000,
  });

  return {
    appointments: query.data?.data ?? [],
    pagination: query.data?.meta?.pagination ?? null,
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
    refetch: () => { void query.refetch(); },
  };
}

export function useAppointment(id: string | undefined): {
  appointment: Appointment | null;
  isLoading: boolean;
  error: HttpError | null;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: ['appointments', 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await httpClient.get<{ data: Appointment }>(`/appointments/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  return {
    appointment: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
    refetch: () => { void query.refetch(); },
  };
}
