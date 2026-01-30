/**
 * useExerciseProgression Hook
 * Reactive hook for fetching exercise progression data for charting
 */

import { useQuery } from '@tanstack/react-query';
import { database } from '../../app/_lib/database';
import { queryKeys } from '../../app/_lib/react-query-client';

interface UseExerciseProgressionOptions {
  enabled?: boolean;
  limit?: number;
}

interface ExerciseProgressionData {
  session_id: string;
  session_date: string;
  total_volume_kg: number;
  max_weight_kg: number;
  total_reps: number;
  set_count: number;
}

interface UseExerciseProgressionReturn {
  data: ExerciseProgressionData[] | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch exercise progression data for charting
 * @param userId - The user's ID
 * @param exerciseId - The exercise ID to track progression for
 * @param options - Optional configuration (enabled, limit)
 * @returns Exercise progression data with loading/error states
 */
export const useExerciseProgression = (
  userId: string | null,
  exerciseId: string | null,
  options: UseExerciseProgressionOptions = {}
): UseExerciseProgressionReturn => {
  const { enabled = true, limit = 10 } = options;

  const query = useQuery({
    queryKey: queryKeys.exerciseProgression(userId!, exerciseId!, limit),
    queryFn: async () => {
      if (!userId || !exerciseId) throw new Error('User ID and Exercise ID required');
      return database.getExerciseProgression(userId, exerciseId, limit);
    },
    enabled: !!userId && !!exerciseId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
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

export default useExerciseProgression;
