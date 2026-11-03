import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type {
  AddDiagnosisInput,
  Diagnosis,
  DiagnosisCatalogEntry,
  Disposition,
  Encounter,
  SoapInput,
  SoapNote,
} from './types';

const encounterKey = (id: number): readonly unknown[] => ['emr', 'encounter', id];

/** Fetch the encounter for a visit (404 → null when none exists yet). */
export function useEncounterByVisit(visitId: number): {
  encounter: Encounter | null;
  isLoading: boolean;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: ['emr', 'visit', visitId],
    queryFn: async () => {
      const res = await httpClient.get<{ data: Encounter }>(`/encounters/visit/${visitId}`);
      return res.data;
    },
    enabled: visitId > 0,
    retry: false,
  });

  return {
    encounter: query.data ?? null,
    isLoading: query.isFetching,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useEncounter(id: number): {
  encounter: Encounter | null;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: encounterKey(id),
    queryFn: async () => {
      const res = await httpClient.get<{ data: Encounter }>(`/encounters/${id}`);
      return res.data;
    },
    enabled: id > 0,
  });

  return { encounter: query.data ?? null, isLoading: query.isFetching };
}

export function useOpenEncounter(): {
  mutateAsync: (input: { visit_id: number; chief_complaint?: string }) => Promise<{ data: Encounter }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: { visit_id: number; chief_complaint?: string }) => {
      return await httpClient.post<{ data: Encounter }>('/encounters', input);
    },
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['emr', 'visit', res.data.visit_id] });
      void qc.invalidateQueries({ queryKey: encounterKey(res.data.id) });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useSaveSoap(encounterId: number): {
  mutateAsync: (input: SoapInput) => Promise<{ data: SoapNote }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: SoapInput) => {
      return await httpClient.put<{ data: SoapNote }>(`/encounters/${encounterId}/soap`, input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: encounterKey(encounterId) });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useSignSoap(encounterId: number): {
  mutateAsync: () => Promise<{ data: SoapNote }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      return await httpClient.post<{ data: SoapNote }>(`/encounters/${encounterId}/soap/sign`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: encounterKey(encounterId) });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useAcknowledgeSoap(encounterId: number): {
  mutateAsync: () => Promise<{ data: SoapNote }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      return await httpClient.post<{ data: SoapNote }>(`/encounters/${encounterId}/soap/acknowledge`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: encounterKey(encounterId) });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useAmendSoap(encounterId: number): {
  mutateAsync: (input: SoapInput) => Promise<{ data: SoapNote }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: SoapInput) => {
      return await httpClient.post<{ data: SoapNote }>(`/encounters/${encounterId}/soap/amend`, input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: encounterKey(encounterId) });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useAddDiagnosis(encounterId: number): {
  mutateAsync: (input: AddDiagnosisInput) => Promise<{ data: Diagnosis }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: AddDiagnosisInput) => {
      return await httpClient.post<{ data: Diagnosis }>(`/encounters/${encounterId}/diagnoses`, input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: encounterKey(encounterId) });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useRemoveDiagnosis(encounterId: number): {
  mutateAsync: (diagnosisId: number) => Promise<void>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (diagnosisId: number) => {
      await httpClient.delete<void>(`/diagnoses/${diagnosisId}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: encounterKey(encounterId) });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

export function useCompleteEncounter(encounterId: number): {
  mutateAsync: (input: { disposition?: Disposition }) => Promise<{ data: Encounter }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: { disposition?: Disposition }) => {
      return await httpClient.post<{ data: Encounter }>(`/encounters/${encounterId}/complete`, input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: encounterKey(encounterId) });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

/** ICD-10 type-ahead. Disabled until the term is at least 2 chars. */
export function useDiagnosisCatalogSearch(term: string): {
  results: DiagnosisCatalogEntry[];
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['emr', 'catalog', term],
    queryFn: async () => {
      const res = await httpClient.get<{ data: DiagnosisCatalogEntry[] }>('/diagnoses-catalog', {
        params: { q: term },
      });
      return res.data;
    },
    enabled: term.trim().length >= 2,
    staleTime: 60_000,
  });

  return { results: query.data ?? [], isLoading: query.isFetching };
}

export function useEmarRecords(visitId: number): {
  data: import('./types').EmarRecord[];
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['emr', 'emar', visitId],
    queryFn: async () => {
      const res = await httpClient.get<{ data: import('./types').EmarRecord[] }>(`/encounters/visit/${visitId}/emar`);
      return res.data;
    },
    enabled: !!visitId,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isFetching,
  };
}

export function usePendingEmarRecords(): {
  data: import('./types').EmarRecord[];
  isLoading: boolean;
  error: unknown;
} {
  const query = useQuery({
    queryKey: ['emr', 'emar', 'pending'],
    queryFn: async () => {
      const res = await httpClient.get<{ data: import('./types').EmarRecord[] }>('/emar/pending');
      return res.data;
    },
    refetchInterval: 15_000,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

interface AddEmarInput {
  medication_id: number;
  prescription_id?: number;
  dose: string;
  route: string;
  frequency?: string;
  scheduled_time: string;
  notes?: string;
}

export function useAddEmarRecord(visitId: number) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: AddEmarInput) => {
      return await httpClient.post<{ data: import('./types').EmarRecord }>(`/encounters/visit/${visitId}/emar`, input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['emr', 'emar', visitId] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}

interface UpdateEmarInput {
  status: 'given' | 'refused' | 'omitted';
  notes?: string;
}

export function useUpdateEmarRecord(visitId: number) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ recordId, data }: { recordId: number; data: UpdateEmarInput }) => {
      return await httpClient.patch<{ data: import('./types').EmarRecord }>(`/encounters/visit/${visitId}/emar/${recordId}`, data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['emr', 'emar', visitId] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
