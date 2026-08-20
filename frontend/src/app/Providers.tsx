import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';
import { AxiosHttpClient, httpClient } from '@/lib/http';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ThemeProvider } from '@/features/theme/ThemeProvider';
import { BranchProvider } from '@/features/branches/BranchProvider';
import { Toaster } from '@/components/feedback/Toaster';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry 4xx (except 408/429)
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
          return false;
        }

        return failureCount < 3;
      },
      // 5 min fresh window — avoids redundant re-fetches when navigating between pages.
      staleTime: 5 * 60 * 1000,
      // Keep unused query data in memory for 10 min so back-navigation is instant.
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: import.meta.env.PROD,
    },
    mutations: {
      retry: false,
    },
  },
});

httpClient.setBaseUrl(import.meta.env.VITE_API_BASE_URL);

interface ProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: ProvidersProps): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <BranchProvider>
            {children}
            <Toaster />
          </BranchProvider>
        </ThemeProvider>
      </AuthProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

// Re-export the typed HTTP client for use outside of TanStack Query hooks.
// eslint-disable-next-line react-refresh/only-export-components
export { AxiosHttpClient, httpClient };
export type { HttpError } from '@/lib/http';
