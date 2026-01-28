/**
 * useWorkoutHistory Hook
 * Reactive hook for fetching workout sessions from SQLite database
 */

import { useQuery } from '@tanstack/react-query';
import { database } from '../../app/_lib/database';
import { queryKeys } from '../../app/_lib/react-query-client';
import type { WorkoutSession } from '@data/storage/models';

interface UseWorkoutHistoryOptions {
  enabled?: boolean;
}

interface UseWorkoutHistoryReturn {
  data: WorkoutSession[] | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch workout sessions for a user
 * @param userId - The user's ID
 * @param options - Optional configuration
 * @returns Workout sessions data with loading/error states
 */
export const useWorkoutHistory = (
  userId: string | null,
  options: UseWorkoutHistoryOptions = {}
): UseWorkoutHistoryReturn => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: queryKeys.workoutSessions(userId!),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      return database.getWorkoutSessions(userId);
    },
    enabled: !!userId && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    data: query.data,
    loading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
};

export default useWorkoutHistory;
