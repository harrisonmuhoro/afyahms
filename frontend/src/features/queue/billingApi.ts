import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';

export interface BillItem {
  id: number;
  description: string;
  category: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface Bill {
  id: number;
  public_id: string;
  visit_id: number;
  patient_id: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: 'pending' | 'partial' | 'cleared' | 'waived';
  is_cleared: boolean;
  payment_method: string | null;
  notes: string | null;
  cleared_at: string | null;
  items: BillItem[];
}

/** Fetch the bill for a visit. */
export function useBill(visitId: number | null): {
  bill: Bill | null;
  isLoading: boolean;
  error: HttpError | null;
} {
  const query = useQuery({
    queryKey: ['billing', 'visit', visitId],
    queryFn: async () => {
      if (visitId === null) return null;
      const res = await httpClient.get<{ data: Bill }>(`/billing/visits/${visitId}/bill`);
      return res.data;
    },
    enabled: visitId !== null,
    staleTime: 15_000,
  });

  return {
    bill: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

/** Check whether a visit's bill is cleared (lightweight status check). */
export function useBillStatus(visitId: number | null): {
  isCleared: boolean | null;
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: ['billing', 'status', visitId],
    queryFn: async () => {
      if (visitId === null) return null;
      const res = await httpClient.get<{ data: { visit_id: number; is_cleared: boolean } }>(
        `/billing/visits/${visitId}/bill/status`,
      );
      return res.data.is_cleared;
    },
    enabled: visitId !== null,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  return {
    isCleared: query.data ?? null,
    isLoading: query.isLoading,
  };
}

/** Record a payment on a bill. */
export function useRecordPayment(visitId: number): {
  mutateAsync: (data: { amount: number; method?: string }) => Promise<{ data: Bill }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data: { amount: number; method?: string }) => {
      return await httpClient.post<{ data: Bill }>(
        `/billing/visits/${visitId}/bill/pay`,
        data,
        { headers: { 'Idempotency-Key': crypto.randomUUID() } },
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing', 'visit', visitId] });
      void qc.invalidateQueries({ queryKey: ['billing', 'status', visitId] });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Staff-clear a bill (override). */
export function useMarkBillCleared(visitId: number): {
  mutateAsync: (data?: { reason?: string }) => Promise<{ data: Bill }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data?: { reason?: string }) => {
      return await httpClient.post<{ data: Bill }>(
        `/billing/visits/${visitId}/bill/clear`,
        data ?? {},
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing', 'visit', visitId] });
      void qc.invalidateQueries({ queryKey: ['billing', 'status', visitId] });
      void qc.invalidateQueries({ queryKey: ['queue', 'board'] });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}

/** Add a bill line-item. */
export function useAddBillItem(visitId: number): {
  mutateAsync: (item: Omit<BillItem, 'id' | 'total_price'>) => Promise<{ data: Bill }>;
  isPending: boolean;
} {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (item: Omit<BillItem, 'id' | 'total_price'>) => {
      return await httpClient.post<{ data: Bill }>(
        `/billing/visits/${visitId}/bill/items`,
        item,
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['billing', 'visit', visitId] });
    },
  });
  return { mutateAsync: mutation.mutateAsync, isPending: mutation.isPending };
}
