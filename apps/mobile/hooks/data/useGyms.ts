/**
 * useGyms Hook
 * Reactive hook for fetching user gyms from SQLite database
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { database } from '../../app/_lib/database';
import { queryKeys } from '../../app/_lib/react-query-client';
import type { Gym } from '@data/storage/models';

interface UseGymsOptions {
  enabled?: boolean;
}

interface UseGymsReturn {
  data: Gym[] | undefined;
  activeGym: Gym | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch gyms for a user
 * @param userId - The user's ID
 * @param options - Optional configuration
 * @returns Gyms data with active gym and loading/error states
 */
export const useGyms = (
  userId: string | null,
  options: UseGymsOptions = {}
): UseGymsReturn => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: queryKeys.gyms(userId!),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      return database.getGyms(userId);
    },
    enabled: !!userId && enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Derive active gym from data
  const activeGym = useMemo(() => {
    if (!query.data || query.data.length === 0) return null;
    
    // Find the active gym
    const active = query.data.find(gym => gym.is_active);
    if (active) return active;
    
    // If no active gym, return first gym
    return query.data[0] || null;
  }, [query.data]);

  return {
    data: query.data,
    activeGym,
    loading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
};

export default useGyms;
