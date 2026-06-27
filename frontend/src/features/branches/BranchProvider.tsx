import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { httpClient } from '@/lib/http';

export interface Branch {
  id: number;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  currency: string;
  is_active: boolean;
}

interface BranchContextValue {
  branches: Branch[];
  activeBranch: Branch | null;
  isLoading: boolean;
  error: unknown;
  refresh: () => void;
}

const BranchContext = createContext<BranchContextValue | null>(null);

async function fetchBranches(): Promise<Branch[]> {
  const response = await httpClient.get<{ data: Branch[] } | Branch[]>('/branches');
  return Array.isArray(response) ? response : response.data;
}

interface BranchProviderProps {
  children: ReactNode;
}

export function BranchProvider({ children }: BranchProviderProps): JSX.Element {
  const { isAuthenticated, user } = useAuth();
  const [activeBranchId, setActiveBranchId] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['branches', 'all'],
    queryFn: fetchBranches,
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (user?.current_branch) {
      setActiveBranchId(user.current_branch.id);
    }
  }, [user?.current_branch]);

  const branches = useMemo<Branch[]>(() => data ?? [], [data]);

  const activeBranch = useMemo<Branch | null>(() => {
    if (branches.length === 0) {
      return null;
    }
    const id = activeBranchId ?? user?.current_branch?.id ?? branches[0]?.id ?? null;
    if (id === null) {
      return null;
    }

    return branches.find((branch) => branch.id === id) ?? null;
  }, [branches, activeBranchId, user?.current_branch?.id]);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const value = useMemo<BranchContextValue>(
    () => ({ branches, activeBranch, isLoading, error, refresh }),
    [branches, activeBranch, isLoading, error, refresh],
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBranches(): BranchContextValue {
  const ctx = useContext(BranchContext);
  if (ctx === null) {
    throw new Error('useBranches must be used inside BranchProvider');
  }

  return ctx;
}