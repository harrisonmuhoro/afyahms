import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { InventoryItem } from './types';

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
          ...(lowStockOnly === true ? { low_stock: 'true' } : {}),
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
