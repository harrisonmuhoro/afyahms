import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { CorrectionStatus, DataCorrectionRequest } from './types';

const CORRECTIONS_KEY = ['records', 'corrections'] as const;

/** Paginated data-correction requests (GET /data-correction-requests). */
export function useCorrectionRequests(status?: CorrectionStatus): {
  data: DataCorrectionRequest[];
  isLoading: boolean;
  error: HttpError | null;
} {
  const query = useQuery({
    queryKey: [...CORRECTIONS_KEY, status ?? 'all'],
    queryFn: async () => {
      const res = await httpClient.get<{ data: DataCorrectionRequest[] }>('/data-correction-requests', {
        params: { per_page: 50, ...(status !== undefined ? { status } : {}) },
      });
      return res.data;
    },
    staleTime: 15_000,
    retry: false,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

/** Approve or reject a correction (PATCH /data-correction-requests/{id}/review). */
export function useReviewCorrection(): {
  mutateAsync: (input: {
    id: string;
    status: 'approved' | 'rejected';
    reason: string;
  }) => Promise<{ data: DataCorrectionRequest }>;
  isPending: boolean;
  error: HttpError | null;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: 'approved' | 'rejected'; reason: string }) =>
      await httpClient.patch<{ data: DataCorrectionRequest }>(`/data-correction-requests/${id}/review`, {
        status,
        reason,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: CORRECTIONS_KEY });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as HttpError | null,
  };
}
