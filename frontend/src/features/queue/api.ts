import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type {
  BoardSnapshot,
  PublicBoard,
  QueueStation,
  QueueTicket,
  StationCode,
  Visit,
} from './types';

const STATIONS_KEY = ['queue', 'stations'] as const;

export function useStations(): {
  data: QueueStation[];
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: STATIONS_KEY,
    queryFn: async () => {
      const res = await httpClient.get<{ data: QueueStation[] }>('/queue/stations');
      return res.data;
    },
    staleTime: 60_000,
  });
  return {
    data: query.data ?? [],
    isLoading: query.isFetching,
  };
}

export function useBoard(code: StationCode, options?: { polling?: boolean }): {
  snapshot: BoardSnapshot | null;
  isLoading: boolean;
  refetch: () => void;
} {
  const polling = options?.polling ?? true;
  const query = useQuery({
    queryKey: ['queue', 'board', code],
    queryFn: async () => {
      const res = await httpClient.get<{ data: BoardSnapshot }>(`/queue/boards/${code}`);
      return res.data;
    },
    refetchInterval: polling ? 4_000 : false,
    refetchOnWindowFocus: true,
    staleTime: 1_000,
  });

  return {
    snapshot: query.data ?? null,
    isLoading: query.isFetching,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function usePublicBoard(code: StationCode): {
  snapshot: PublicBoard | null;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['queue', 'board', 'public', code],
    queryFn: async () => {
      const res = await httpClient.get<{ data: PublicBoard }>(`/queue/boards/${code}/public`);
      return res.data;
    },
    refetchInterval: 5_000,
    staleTime: 1_000,
  });

  return {
    snapshot: query.data ?? null,
    isLoading: query.isFetching,
  };
}

interface OpenVisitInput {
  patient_id: number;
  visit_type: 'walk_in' | 'appointment' | 'referral' | 'follow_up' | 'emergency';
}

export function useOpenVisit(): {
  mutate: (input: OpenVisitInput) => void;
  mutateAsync: (input: OpenVisitInput) => Promise<{ data: Visit }>;
  isPending: boolean;
  error: unknown;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: OpenVisitInput) => {
      return await httpClient.post<{ data: Visit }>('/visits', input);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['queue', 'board'] });
      void qc.invalidateQueries({ queryKey: ['patients', 'list'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}

export function useStartTicket(): {
  mutate: (ticketId: number) => void;
  mutateAsync: (ticketId: number) => Promise<{ data: QueueTicket }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (ticketId: number) => {
      return await httpClient.post<{ data: QueueTicket }>(`/queue/tickets/${ticketId}/start`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['queue', 'board'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}

interface CompleteInput {
  ticketId: number;
  next_station?: StationCode;
}

export function useCompleteTicket(): {
  mutate: (input: CompleteInput) => void;
  mutateAsync: (input: CompleteInput) => Promise<{ data: QueueTicket }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ ticketId, next_station }: CompleteInput) => {
      return await httpClient.post<{ data: QueueTicket }>(
        `/queue/tickets/${ticketId}/complete`,
        next_station !== undefined ? { next_station } : {},
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['queue', 'board'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}

export function useHoldTicket(): {
  mutate: (ticketId: number) => void;
  mutateAsync: (ticketId: number) => Promise<{ data: QueueTicket }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (ticketId: number) => {
      return await httpClient.post<{ data: QueueTicket }>(`/queue/tickets/${ticketId}/hold`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['queue', 'board'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}

export function useNoShowTicket(): {
  mutate: (ticketId: number) => void;
  mutateAsync: (ticketId: number) => Promise<{ data: QueueTicket }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (ticketId: number) => {
      return await httpClient.post<{ data: QueueTicket }>(`/queue/tickets/${ticketId}/no-show`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['queue', 'board'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}

export function useCallNext(): {
  mutate: (stationId: number) => void;
  mutateAsync: (stationId: number) => Promise<{ data: QueueTicket }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (stationId: number) => {
      return await httpClient.post<{ data: QueueTicket }>(
        `/queue/stations/${stationId}/call-next`,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['queue', 'board'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}

export function useKpis(): {
  data: { active_tickets: number; patients_seen: number; awaiting_triage: number } | null;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['queue', 'kpis'],
    queryFn: async () => {
      const res = await httpClient.get<{ data: { active_tickets: number; patients_seen: number; awaiting_triage: number } }>('/queue/kpis');
      return res.data;
    },
    refetchInterval: 10_000,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isFetching,
  };
}
