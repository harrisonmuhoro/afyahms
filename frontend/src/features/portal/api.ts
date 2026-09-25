import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { Patient } from '@/features/patients/types';
import type { DoctorSchedule, Appointment, BookAppointmentPayload } from '@/features/appointments/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalMeResponse { patient: Patient }

export interface PortalDemographicsPayload {
  current_password: string;
  first_name?: string; middle_name?: string | null; last_name?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown'; marital_status?: string | null;
  phone?: string | null; email?: string | null; county?: string | null;
  sub_county?: string | null; address?: string | null; occupation?: string | null;
  date_of_birth?: string | null; national_id?: string | null;
  guardian_name?: string | null; guardian_national_id?: string | null;
  guardian_relationship?: string | null;
}

export interface PortalConversation {
  id: string;
  subject: string | null;
  unread_count: number;
  updated_at: string;
  users: Array<{ id: number; name: string }>;
}

export interface PortalMessage {
  id: string;
  conversation_id: string;
  sender_id: number;
  body: string;
  created_at: string;
  sender: { id: number; name: string } | null;
}

export interface PortalMessageRecipient {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface PortalInvoice {
  id: string;
  public_id: string;
  total_amount: number;
  paid_amount: number;
  status: 'pending' | 'partial' | 'cleared' | 'waived';
  payment_method: string | null;
  mpesa_status?: 'pending' | 'success' | 'failed' | null;
  mpesa_receipt?: string | null;
  notes: string | null;
  created_at: string;
  visit: { id: number; created_at: string } | null;
  items: Array<{ id: number; description: string; amount: number; quantity: number }>;
}

export interface PortalResult {
  id: string;
  source: 'lab' | 'radiology';
  name: string;
  category: string | null;
  status: string;
  ordered_by: string | null;
  priority: string | null;
  resulted_at: string | null;
  reported_at: string | null;
  created_at: string;
  result: Record<string, unknown> | null;
}

export interface PortalPrescription {
  id: number;
  patient_id: number;
  notes: string | null;
  status: string;
  created_at: string;
  doctor: { id: number; first_name: string; last_name: string } | null;
  items: Array<{ id: number; medication_name: string; dosage: string; frequency: string; duration: string; instructions: string | null }>;
}

export interface PortalDocument {
  id: number;
  public_id: string;
  encounter_type: string;
  department: string | null;
  visit_date: string;
  status: string;
  chief_complaint: string | null;
  provider: { id: number; first_name: string; last_name: string } | null;
  soap_note: { subjective: string | null; objective: string | null; assessment: string | null; plan: string | null } | null;
  diagnoses: Array<{ icd_code: string; description: string; type: string }>;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export function usePortalPatient(): { patient: Patient | null; isLoading: boolean; error: HttpError | null } {
  const query = useQuery({
    queryKey: ['portal', 'me'],
    queryFn: () => httpClient.get<PortalMeResponse>('/portal/me'),
    staleTime: 60_000,
  });
  return { patient: query.data?.patient ?? null, isLoading: query.isLoading, error: query.error as HttpError | null };
}

export function useUpdatePortalDemographics() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (payload: PortalDemographicsPayload) =>
      httpClient.patch<{ data: Patient }>('/portal/me/demographics', payload),
    onSuccess: (response) => {
      queryClient.setQueryData(['portal', 'me'], { patient: response.data });
      void queryClient.invalidateQueries({ queryKey: ['portal', 'me'] });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending, error: mutation.error as HttpError | null };
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export function usePortalMessageRecipients() {
  return useQuery({
    queryKey: ['portal', 'message-recipients'],
    queryFn: () => httpClient.get<{ data: PortalMessageRecipient[] }>('/portal/message-recipients'),
    staleTime: 60_000,
  });
}

export function usePortalConversations() {
  return useQuery({
    queryKey: ['portal', 'messages'],
    queryFn: () => httpClient.get<{ data: PortalConversation[] }>('/portal/messages'),
    staleTime: 30_000,
  });
}

export function usePortalConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ['portal', 'messages', conversationId],
    queryFn: () => httpClient.get<{ conversation: PortalConversation; messages: PortalMessage[] }>(`/portal/messages/${conversationId}`),
    enabled: !!conversationId,
  });
}

export function useSendPortalMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { body: string; subject?: string; conversation_id?: string; recipient_ids?: number[] }) =>
      httpClient.post<{ message: string; data: PortalMessage }>('/portal/messages', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal', 'messages'] });
    },
  });
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export function usePortalInvoices() {
  return useQuery({
    queryKey: ['portal', 'invoices'],
    queryFn: () => httpClient.get<{ data: PortalInvoice[] }>('/portal/invoices'),
    staleTime: 60_000,
    refetchInterval: (query) => query.state.data?.data.some((invoice) => invoice.mpesa_status === 'pending') ? 4_000 : false,
  });
}

export function usePayPortalInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ publicId, phone }: { publicId: string; phone: string }) =>
      httpClient.post<{ message: string; status: string; bill: PortalInvoice }>(`/portal/invoices/${publicId}/pay`, { phone }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal', 'invoices'] });
    },
  });
}

// ─── Results ──────────────────────────────────────────────────────────────────

export function usePortalResults() {
  return useQuery({
    queryKey: ['portal', 'results'],
    queryFn: () => httpClient.get<{ data: PortalResult[] }>('/portal/results'),
    staleTime: 60_000,
  });
}

// ─── Records ──────────────────────────────────────────────────────────────────

export function usePortalPrescriptions() {
  return useQuery({
    queryKey: ['portal', 'prescriptions'],
    queryFn: () => httpClient.get<{ data: PortalPrescription[] }>('/portal/prescriptions'),
    staleTime: 60_000,
  });
}

export function usePortalDocuments() {
  return useQuery({
    queryKey: ['portal', 'documents'],
    queryFn: () => httpClient.get<{ data: PortalDocument[] }>('/portal/documents'),
    staleTime: 60_000,
  });
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export interface PortalAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  doctor?: { id: string; name: string };
  branch?: { id: string; name: string };
}

export type PortalBookAppointmentPayload = Omit<BookAppointmentPayload, 'patient_id' | 'booked_via'>;

export function usePortalAppointments() {
  return useQuery({
    queryKey: ['portal', 'appointments'],
    queryFn: () => httpClient.get<{ data: PortalAppointment[] }>('/portal/appointments'),
    staleTime: 30_000,
  });
}

export function usePortalSchedules() {
  return useQuery({
    queryKey: ['portal', 'appointment-schedules'],
    queryFn: () => httpClient.get<{ data: DoctorSchedule[] }>('/portal/appointments/schedules'),
    staleTime: 60_000,
  });
}

export function usePortalBookAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PortalBookAppointmentPayload): Promise<Appointment> => {
      const response = await httpClient.post<{ appointment: Appointment }>('/portal/appointments', payload);
      return response.appointment;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal', 'appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['slots', 'available', '/portal/appointments/slots'] });
    },
  });
}

export function usePortalCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      httpClient.patch<{ message: string }>(`/portal/appointments/${id}/cancel`, { reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['portal', 'appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['slots', 'available', '/portal/appointments/slots'] });
    },
  });
}
