import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { LabOrder, LabOrderStatus, LabResult, RecordResultPayload } from './types';

const WORKLIST_KEY = ['lab', 'worklist'] as const;

/** Branch-wide lab worklist (GET /lab/orders), polled for the dashboard. */
export function useLabWorklist(status?: LabOrderStatus): {
  data: LabOrder[];
  isLoading: boolean;
  error: HttpError | null;
} {
  const query = useQuery({
    queryKey: [...WORKLIST_KEY, status ?? 'all'],
    queryFn: async () => {
      const res = await httpClient.get<{ data: LabOrder[] }>('/lab/orders', {
        params: status !== undefined ? { status } : {},
      });
      return res.data;
    },
    refetchInterval: 15_000,
    staleTime: 5_000,
    retry: false,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

function useOrderAction(path: 'collect' | 'process'): {
  mutateAsync: (orderId: number) => Promise<{ data: LabOrder }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (orderId: number) =>
      await httpClient.post<{ data: LabOrder }>(`/lab/orders/${orderId}/${path}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WORKLIST_KEY });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Mark sample collected. */
export function useCollectSample(): ReturnType<typeof useOrderAction> {
  return useOrderAction('collect');
}

/** Move order into analysis. */
export function useStartProcessing(): ReturnType<typeof useOrderAction> {
  return useOrderAction('process');
}

/** Record a result against an order (POST /lab/orders/{order}/result). */
export function useRecordResult(): {
  mutateAsync: (input: { orderId: number; payload: RecordResultPayload }) => Promise<{ data: LabResult }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ orderId, payload }: { orderId: number; payload: RecordResultPayload }) =>
      await httpClient.post<{ data: LabResult }>(`/lab/orders/${orderId}/result`, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WORKLIST_KEY });
    },
  });
  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}

/** Verify & release a recorded result (POST /lab/results/{result}/verify). */
export function useVerifyResult(): {
  mutateAsync: (resultId: number) => Promise<{ data: LabResult }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (resultId: number) =>
      await httpClient.post<{ data: LabResult }>(`/lab/results/${resultId}/verify`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WORKLIST_KEY });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}
