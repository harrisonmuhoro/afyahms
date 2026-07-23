import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type {
  InventoryItem, InventoryKpiSummary, ExpiringBatch, Supplier, PurchaseOrder,} from './types';

interface ListItemsArgs {
  search?: string;
  lowStockOnly?: boolean;
}

/**
 * Inventory items list. The Inventory backend module is not wired with routes
 * yet, so this degrades gracefully: an error surfaces an empty list and the
 * page renders its empty/error state rather than crashing.
 */
export function useInventoryItems(args: ListItemsArgs = {}): {
  data: InventoryItem[];
  isLoading: boolean;
  error: HttpError | null;
} {
  const { search, lowStockOnly } = args;

  const query = useQuery({
    queryKey: ['inventory', 'items', { search, lowStockOnly }],
    queryFn: async () => {
      const res = await httpClient.get<{ data: InventoryItem[] }>('/inventory/items', {
        params: {
          ...(search !== undefined && search !== '' ? { search } : {}),
          ...(lowStockOnly === true ? { low_stock: 1 } : {}),
        },
      });
      return res.data;
    },
    staleTime: 30_000,
    retry: false,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

/** KPI summary for the inventory dashboard header cards. */
export function useInventoryKpis(): {
  data: InventoryKpiSummary | null;
  isLoading: boolean;
  error: HttpError | null;
} {
  const query = useQuery({
    queryKey: ['inventory', 'kpi-summary'],
    queryFn: async () => {
      const res = await httpClient.get<{ data: InventoryKpiSummary }>('/inventory/kpi-summary');
      return res.data;
    },
    staleTime: 30_000,
    retry: false,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

/** Batches expiring within the next `days` (default 30). */
export function useExpiringBatches(days = 30): {
  data: ExpiringBatch[];
  isLoading: boolean;
  error: HttpError | null;
} {
  const query = useQuery({
    queryKey: ['inventory', 'batches', 'expiring', days],
    queryFn: async () => {
      const res = await httpClient.get<{ data: ExpiringBatch[] }>('/inventory/batches/expiring', {
        params: { days },
      });
      return res.data;
    },
    staleTime: 60_000,
    retry: false,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

/** Suppliers list (optionally filtered by search). */
export function useSuppliers(search = ''): {
  data: Supplier[];
  isLoading: boolean;
  error: HttpError | null;
} {
  const query = useQuery({
    queryKey: ['inventory', 'suppliers', search],
    queryFn: async () => {
      const res = await httpClient.get<{ data: Supplier[] }>('/inventory/suppliers', {
        params: search !== '' ? { search } : {},
      });
      return res.data;
    },
    staleTime: 60_000,
    retry: false,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}

/** Purchase orders (optionally filtered by status). */
export function usePurchaseOrders(status = ''): {
  data: PurchaseOrder[];
  isLoading: boolean;
  error: HttpError | null;
} {
  const query = useQuery({
    queryKey: ['inventory', 'purchase-orders', status],
    queryFn: async () => {
      const res = await httpClient.get<{ data: PurchaseOrder[] }>('/inventory/purchase-orders', {
        params: status !== '' ? { status } : {},
      });
      return res.data;
    },
    staleTime: 30_000,
    retry: false,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}
