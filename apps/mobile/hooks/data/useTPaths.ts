/**
 * useTPaths Hook
 * Reactive hook for fetching T-Paths from SQLite database
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { database } from '../../app/_lib/database';
import { queryKeys } from '../../app/_lib/react-query-client';
import type { TPath, TPathWithExercises } from '@data/storage/models';
import type { DashboardProgram } from '../../app/_contexts/data-context';

interface UseTPathsOptions {
  enabled?: boolean;
}

interface UseTPathsReturn {
  data: TPath[] | undefined;
  activeTPath: DashboardProgram | null;
  tPathWorkouts: DashboardProgram[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch T-Paths for a user
 * @param userId - The user's ID
 * @param activeTPathId - The ID of the active T-Path (optional)
 * @param options - Optional configuration
 * @returns T-Paths data with active T-Path and loading/error states
 */
export const useTPaths = (
  userId: string | null,
  activeTPathId: string | null = null,
  options: UseTPathsOptions = {}
): UseTPathsReturn => {
  const { enabled = true } = options;

  // Fetch all T-Paths for user
  const tPathsQuery = useQuery({
    queryKey: queryKeys.tPaths(userId!),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      return database.getTPaths(userId);
    },
    enabled: !!userId && enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch active T-Path details if ID is provided
  const activeTPathQuery = useQuery({
    queryKey: ['t-path-detail', activeTPathId],
    queryFn: async () => {
      if (!activeTPathId) return null;
      return database.getTPath(activeTPathId);
    },
    enabled: !!activeTPathId && enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch child workouts of the active T-Path
  const childWorkoutsQuery = useQuery({
    queryKey: ['t-path-children', activeTPathId],
    queryFn: async () => {
      if (!activeTPathId) return [];
      return database.getTPathsByParent(activeTPathId);
    },
    enabled: !!activeTPathId && enabled,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Convert to DashboardProgram format
  const activeTPath = useMemo((): DashboardProgram | null => {
    if (!activeTPathQuery.data) return null;
    
    return {
      id: activeTPathQuery.data.id,
      template_name: activeTPathQuery.data.template_name,
      description: activeTPathQuery.data.description || null,
      parent_t_path_id: activeTPathQuery.data.parent_t_path_id || null,
    };
  }, [activeTPathQuery.data]);

  const tPathWorkouts = useMemo((): DashboardProgram[] => {
    if (!childWorkoutsQuery.data) return [];
    
    // Deduplicate by template_name to only include unique workout templates
    const uniqueWorkoutsMap = new Map<string, DashboardProgram>();
    childWorkoutsQuery.data.forEach(tPath => {
      const normalizedName = tPath.template_name.trim().toLowerCase();
      if (!uniqueWorkoutsMap.has(normalizedName)) {
        uniqueWorkoutsMap.set(normalizedName, {
          id: tPath.id,
          template_name: tPath.template_name,
          description: tPath.description || null,
          parent_t_path_id: tPath.parent_t_path_id || null,
        });
      }
    });
    
    return Array.from(uniqueWorkoutsMap.values());
  }, [childWorkoutsQuery.data]);

  const loading = tPathsQuery.isLoading || activeTPathQuery.isLoading || childWorkoutsQuery.isLoading;
  const error = tPathsQuery.error || activeTPathQuery.error || childWorkoutsQuery.error;

  return {
    data: tPathsQuery.data,
    activeTPath,
    tPathWorkouts,
    loading,
    error: error as Error | null,
    refetch: async () => {
      await Promise.all([
        tPathsQuery.refetch(),
        activeTPathQuery.refetch(),
        childWorkoutsQuery.refetch(),
      ]);
    },
  };
};

export default useTPaths;
