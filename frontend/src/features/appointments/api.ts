import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { Appointment, AvailableSlot, DoctorSchedule, BookAppointmentPayload } from './types';

// API Functions — httpClient.get<T>() returns T directly (not a wrapper)
const fetchAppointments = async (params?: Record<string, string>) => {
  return httpClient.get<{ data: Appointment[]; meta?: unknown }>('/v1/appointments', { params });
};

const fetchSlots = async (params: { doctor_id: string; branch_id: string; date: string }) => {
  const res = await httpClient.get<{ data: AvailableSlot[] }>('/v1/appointments/slots', { params });
  return res.data;
};

const fetchSchedules = async (params?: Record<string, string>) => {
  const res = await httpClient.get<{ data: DoctorSchedule[] }>('/v1/appointments/schedules', { params });
  return res.data;
};

const bookAppointment = async (payload: BookAppointmentPayload) => {
  const res = await httpClient.post<{ appointment: Appointment }>('/v1/appointments', payload);
  return res.appointment;
};

const cancelAppointment = async ({ id, reason }: { id: string; reason?: string }) => {
  return httpClient.post<{ message: string }>(`/v1/appointments/${id}/cancel`, { reason });
};

const confirmAppointment = async (id: string) => {
  return httpClient.post<{ message: string }>(`/v1/appointments/${id}/confirm`);
};

const checkInPatient = async (id: string) => {
  return httpClient.post<{ message: string }>(`/v1/appointments/${id}/check-in`);
};

// ── React Query Hooks ─────────────────────────────────────────────────────────

export function useAppointments(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['appointments', params],
    queryFn: () => fetchAppointments(params),
  });
}

export function useAvailableSlots(
  params: { doctor_id: string; branch_id: string; date: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ['slots', params],
    queryFn: () => fetchSlots(params),
    enabled: enabled && !!params.doctor_id && !!params.branch_id && !!params.date,
  });
}

export function useSchedules(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['schedules', params],
    queryFn: () => fetchSchedules(params),
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bookAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useConfirmAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmAppointment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

export function useCheckInPatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: checkInPatient,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });
}
