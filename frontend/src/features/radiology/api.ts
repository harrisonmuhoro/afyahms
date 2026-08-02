import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { ImagingOrder, ImagingOrderStatus, ImagingReport, SaveReportPayload } from './types';

const WORKLIST_KEY = ['radiology', 'worklist'] as const;

/** Branch-wide imaging worklist (GET /radiology/orders), polled for the dashboard. */
export function useImagingWorklist(status?: ImagingOrderStatus): {
  data: ImagingOrder[];
  isLoading: boolean;
  error: HttpError | null;
} {
  const query = useQuery({
    queryKey: [...WORKLIST_KEY, status ?? 'all'],
    queryFn: async () => {
      const res = await httpClient.get<{ data: ImagingOrder[] }>('/radiology/orders', {
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

/** Mark a study acquired (POST /radiology/orders/{order}/acquire). */
export function useMarkAcquired(): {
  mutateAsync: (orderId: number) => Promise<{ data: ImagingOrder }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (orderId: number) =>
      await httpClient.post<{ data: ImagingOrder }>(`/radiology/orders/${orderId}/acquire`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WORKLIST_KEY });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Save a draft report (POST /radiology/orders/{order}/report). */
export function useSaveReport(): {
  mutateAsync: (input: { orderId: number; payload: SaveReportPayload }) => Promise<{ data: ImagingReport }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ orderId, payload }: { orderId: number; payload: SaveReportPayload }) =>
      await httpClient.post<{ data: ImagingReport }>(`/radiology/orders/${orderId}/report`, payload),
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

/** Sign/finalize a report (POST /radiology/reports/{report}/finalize). */
export function useFinalizeReport(): {
  mutateAsync: (reportId: number) => Promise<{ data: ImagingReport }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (reportId: number) =>
      await httpClient.post<{ data: ImagingReport }>(`/radiology/reports/${reportId}/finalize`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: WORKLIST_KEY });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}
