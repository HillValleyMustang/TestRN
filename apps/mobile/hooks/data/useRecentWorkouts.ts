/**
 * useRecentWorkouts Hook
 * Reactive hook for fetching recent workout summaries from SQLite database
 */

import { useQuery } from '@tanstack/react-query';
import { database } from '../../app/_lib/database';
import { queryKeys } from '../../app/_lib/react-query-client';
import type { DashboardWorkoutSummary } from '../../app/_contexts/data-context';

interface UseRecentWorkoutsOptions {
  enabled?: boolean;
}

interface UseRecentWorkoutsReturn {
  data: DashboardWorkoutSummary[] | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch recent workout summaries for a user
 * @param userId - The user's ID
 * @param limit - Maximum number of workouts to fetch (default: 3)
 * @param options - Optional configuration
 * @returns Recent workout summaries with loading/error states
 */
export const useRecentWorkouts = (
  userId: string | null,
  limit: number = 3,
  options: UseRecentWorkoutsOptions = {}
): UseRecentWorkoutsReturn => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: queryKeys.recentWorkouts(userId!, limit),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      const summaries = await database.getRecentWorkoutSummaries(userId, limit);
      
      // Transform to DashboardWorkoutSummary format
      return summaries.map(({ session, exercise_count, gym_name }) => ({
        id: session.id,
        template_name: session.template_name,
        session_date: session.session_date,
        completed_at: session.completed_at,
        duration_string: session.duration_string,
        exercise_count,
        gym_name,
      }));
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

export default useRecentWorkouts;
