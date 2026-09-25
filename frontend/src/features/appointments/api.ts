import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { BranchPublicHoliday, DoctorSchedule, ScheduleOverride } from './types';



const fetchSchedules = async (params?: Record<string, string>) => {
  const res = await httpClient.get<{ data: DoctorSchedule[] }>('/appointments/schedules', { params });
  return res.data;
};



export async function confirmAppointment(id: string): Promise<{ message: string }> {
  return httpClient.patch<{ message: string }>(`/appointments/${id}/confirm`);
}

export async function checkInAppointment(id: string): Promise<{ message: string }> {
  return httpClient.patch<{ message: string }>(`/appointments/${id}/check-in`);
}

export async function markNoShowAppointment(id: string, reason?: string): Promise<{ message: string }> {
  return httpClient.patch<{ message: string }>(`/appointments/${id}/no-show`, { reason });
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

export function useMarkNoShowAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => markNoShowAppointment(id, reason),
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

export interface SaveScheduleOverridePayload {
  override_date: string;
  type: 'unavailable' | 'extra';
  start_time?: string | null;
  end_time?: string | null;
  reason?: string;
}

export async function saveScheduleOverride(
  scheduleId: string,
  data: SaveScheduleOverridePayload,
): Promise<{ message: string; override: ScheduleOverride; conflicts: Array<{ id: string; appointment_number: string }>; manual_review_required: boolean }> {
  return httpClient.post(`/appointments/schedules/${scheduleId}/overrides`, {
    ...data,
    start_time: data.start_time ? `${data.start_time}:00`.slice(0, 8) : null,
    end_time: data.end_time ? `${data.end_time}:00`.slice(0, 8) : null,
  });
}

export async function removeScheduleOverride(scheduleId: string, date: string): Promise<{ message: string }> {
  return httpClient.delete(`/appointments/schedules/${scheduleId}/overrides/${date}`);
}

export function useSaveScheduleOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: string; data: SaveScheduleOverridePayload }) =>
      saveScheduleOverride(scheduleId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

export function useRemoveScheduleOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, date }: { scheduleId: string; date: string }) =>
      removeScheduleOverride(scheduleId, date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schedules'] }),
  });
}

async function fetchBranchHolidays(branchId: number): Promise<BranchPublicHoliday[]> {
  const response = await httpClient.get<{ data: BranchPublicHoliday[] }>('/appointments/holidays', {
    params: { branch_id: String(branchId) },
  });
  return response.data;
}

export function useBranchHolidays(branchId: number | null) {
  return useQuery({
    queryKey: ['appointment-holidays', branchId],
    queryFn: () => fetchBranchHolidays(branchId as number),
    enabled: branchId !== null,
  });
}

export interface SaveHolidayPayload {
  branch_id: number;
  holiday_date: string;
  name: string;
  is_active?: boolean;
}

export async function saveBranchHoliday(data: SaveHolidayPayload): Promise<{ message: string; holiday: BranchPublicHoliday }> {
  return httpClient.post('/appointments/holidays', data);
}

export async function removeBranchHoliday(id: number | string): Promise<{ message: string }> {
  return httpClient.delete(`/appointments/holidays/${id}`);
}

export function useSaveBranchHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveBranchHoliday,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointment-holidays'] }),
  });
}

export function useRemoveBranchHoliday() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeBranchHoliday,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointment-holidays'] }),
  });
}
