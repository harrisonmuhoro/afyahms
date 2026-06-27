import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { MtsCategory, QueueTicket, TriageAssessment } from '../queue/types';

export interface RecordTriageInput {
  visit_id: number;
  mts_level: MtsCategory;
  chief_complaint?: string;
  temperature_c?: number;
  pulse_bpm?: number;
  respiratory_rate?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  spo2_pct?: number;
  pain_score?: number;
  weight_kg?: number;
  height_cm?: number;
  notes?: string;
}

export function useRecordTriage(): {
  mutate: (input: RecordTriageInput) => void;
  mutateAsync: (input: RecordTriageInput) => Promise<{ data: TriageAssessment }>;
  isPending: boolean;
  error: unknown;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: RecordTriageInput) => {
      return await httpClient.post<{ data: TriageAssessment }>('/triage', input);
    },
    onSuccess: (response) => {
      const visitId = response.data.visit_id;
      void qc.invalidateQueries({ queryKey: ['queue', 'board'] });
      void qc.invalidateQueries({ queryKey: ['triage', 'visit', visitId] });
      void qc.invalidateQueries({ queryKey: ['queue', 'ticket'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export function useTriageByVisit(visitId: number): {
  assessment: TriageAssessment | null;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['triage', 'visit', visitId],
    queryFn: async () => {
      const res = await httpClient.get<{ data: TriageAssessment }>(`/triage/visit/${visitId}`);
      return res.data;
    },
    enabled: visitId > 0,
    retry: false,
  });

  return {
    assessment: query.data ?? null,
    isLoading: query.isFetching,
  };
}

export type { QueueTicket, TriageAssessment, MtsCategory };
