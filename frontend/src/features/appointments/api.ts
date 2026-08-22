import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { DoctorSchedule } from './types';



const fetchSchedules = async (params?: Record<string, string>) => {
  const res = await httpClient.get<{ data: DoctorSchedule[] }>('/appointments/schedules', { params });
  return res.data;
};



export async function confirmAppointment(id: number): Promise<{ message: string }> {
  return httpClient.post<{ message: string }>(`/appointments/${id}/confirm`);
}

export async function checkInAppointment(id: number): Promise<{ message: string }> {
  return httpClient.post<{ message: string }>(`/appointments/${id}/check-in`);
}

export async function submitClinicalVitals(appointmentId: number, data: unknown): Promise<{ message: string }> {
  return httpClient.post<{ message: string }>(`/appointments/${appointmentId}/vitals`, data);
}

// ── React Query Hooks ─────────────────────────────────────────────────────────

export function useSchedules(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['schedules', params],
    queryFn: () => fetchSchedules(params),
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
    mutationFn: checkInAppointment,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });
}

// ── Schedule Management ───────────────────────────────────────────────────────

export interface SaveSchedulePayload {
  doctor_id: number;
  branch_id: number;
  name: string;
  slot_duration: number;
  max_concurrent: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  time_blocks: {
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[];
}

export async function createSchedule(data: SaveSchedulePayload): Promise<{ message: string; schedule: DoctorSchedule }> {
  return httpClient.post<{ message: string, schedule: DoctorSchedule }>('/appointments/schedules', data);
}

export async function updateSchedule(id: number, data: SaveSchedulePayload): Promise<{ message: string; schedule: DoctorSchedule }> {
  return httpClient.put<{ message: string, schedule: DoctorSchedule }>(`/appointments/schedules/${id}`, data);
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSchedule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SaveSchedulePayload }) => updateSchedule(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });
}
