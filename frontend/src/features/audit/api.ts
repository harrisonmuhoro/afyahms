import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';
import type { HttpError } from '@/lib/http';
import type { Paginated } from '@/lib/types';
import type { AuditEntry } from './types';

interface ListAuditArgs {
  page?: number;
  perPage?: number;
  event?: string;
}

/**
 * Paginated audit log. The Audit backend module has no routes yet, so this
 * degrades gracefully (retry: false) and the page renders its error/empty
 * state until the endpoint exists.
 */
export function useAuditLog(args: ListAuditArgs = {}): {
  data: AuditEntry[];
  pagination: Paginated<AuditEntry>['meta'] | null;
  isLoading: boolean;
  error: HttpError | null;
} {
  const { page = 1, perPage = 50, event } = args;

  const query = useQuery({
    queryKey: ['audit', 'log', { page, perPage, event }],
    queryFn: async () => {
      return await httpClient.get<Paginated<AuditEntry>>('/audit/logs', {
        params: {
          page,
          per_page: perPage,
          ...(event !== undefined && event !== '' ? { event } : {}),
        },
      });
    },
    staleTime: 15_000,
    retry: false,
  });

  return {
    data: query.data?.data ?? [],
    pagination: query.data?.meta ?? null,
    isLoading: query.isLoading,
    error: query.error as HttpError | null,
  };
}
