/**
 * useWorkoutComparison Hook
 * Reactive hook for fetching workout comparison data (current vs previous same-type workout)
 */

import { useQuery } from '@tanstack/react-query';
import { database } from '../../app/_lib/database';
import { queryKeys } from '../../app/_lib/react-query-client';

interface UseWorkoutComparisonOptions {
  enabled?: boolean;
}

interface WorkoutComparisonData {
  current: { total_volume_kg: number; exercise_count: number };
  previous: { total_volume_kg: number; exercise_count: number };
}

interface UseWorkoutComparisonReturn {
  data: WorkoutComparisonData | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  percentageChange: number | null;
}

/**
 * Hook to fetch workout comparison data between current and previous sessions
 * @param userId - The user's ID
 * @param currentSessionId - Current session ID
 * @param previousSessionId - Previous session ID to compare against
 * @param options - Optional configuration
 * @returns Workout comparison data with percentage change calculation
 */
export const useWorkoutComparison = (
  userId: string | null,
  currentSessionId: string | null,
  previousSessionId: string | null,
  options: UseWorkoutComparisonOptions = {}
): UseWorkoutComparisonReturn => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: queryKeys.workoutComparison(userId!, currentSessionId!, previousSessionId!),
    queryFn: async () => {
      if (!userId || !currentSessionId || !previousSessionId) {
        throw new Error('User ID, current session ID, and previous session ID required');
      }
      return database.getWorkoutComparison(userId, currentSessionId, previousSessionId);
    },
    enabled: !!userId && !!currentSessionId && !!previousSessionId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  });

  // Calculate percentage change in volume
  const percentageChange = query.data
    ? ((query.data.current.total_volume_kg - query.data.previous.total_volume_kg) /
        query.data.previous.total_volume_kg) *
      100
    : null;

  return {
    data: query.data,
    loading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
    percentageChange,
  };
};

export default useWorkoutComparison;
