/**
 * useVolumeHistory Hook
 * Reactive hook for fetching volume history from SQLite database
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { database } from '../../app/_lib/database';
import { queryKeys } from '../../app/_lib/react-query-client';
import type { DashboardVolumePoint } from '../../app/_contexts/data-context';

interface UseVolumeHistoryOptions {
  enabled?: boolean;
}

interface UseVolumeHistoryReturn {
  data: DashboardVolumePoint[] | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch volume history for a user
 * @param userId - The user's ID
 * @param days - Number of days to fetch (default: 7)
 * @param options - Optional configuration
 * @returns Volume history with loading/error states
 */
export const useVolumeHistory = (
  userId: string | null,
  days: number = 7,
  options: UseVolumeHistoryOptions = {}
): UseVolumeHistoryReturn => {
  const { enabled = true } = options;

  const volumeQuery = useQuery({
    queryKey: queryKeys.volumeHistory(userId!, days),
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      return database.getVolumeHistory(userId, days);
    },
    enabled: !!userId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - volume doesn't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Also fetch recent workouts for workout type mapping
  const workoutsQuery = useQuery({
    queryKey: ['volume-workouts', userId, days],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      return database.getRecentWorkoutSummaries(userId, 50);
    },
    enabled: !!userId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - workout types don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Build volume points with workout type mapping
  const volumeData = useMemo((): DashboardVolumePoint[] => {
    const rawVolumeHistory = volumeQuery.data || [];
    const recentWorkouts = workoutsQuery.data || [];

    const volumeMap = new Map(
      rawVolumeHistory.map(entry => [entry.date.split('T')[0], entry.volume || 0])
    );

    // Get workout template names for color coding (use first workout completed on each day)
    // Sort workouts by completion time (earliest first) to ensure we capture the first workout of each day
    const workoutTypeByDate = new Map<string, string>();
    
    const sortedWorkouts = [...recentWorkouts].sort((a, b) => {
      // Use completed_at if available, otherwise fall back to session_date
      const timeA = a.session.completed_at || a.session.session_date;
      const timeB = b.session.completed_at || b.session.session_date;
      return new Date(timeA).getTime() - new Date(timeB).getTime();
    });
    
    sortedWorkouts.forEach(({ session }) => {
      const date = session.session_date.split('T')[0];
      // Process from earliest to latest, so the first workout we encounter for each date is the first completed that day
      if (!workoutTypeByDate.has(date) && session.template_name) {
        workoutTypeByDate.set(date, session.template_name);
      }
    });

    // Generate 7 days starting from Monday
    const today = new Date();
    const dayOfWeek = today.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setUTCDate(today.getUTCDate() - daysToMonday);
    monday.setUTCHours(0, 0, 0, 0);

    const points: DashboardVolumePoint[] = [];
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(monday);
      date.setUTCDate(monday.getUTCDate() + i);
      const key = date.toISOString().split('T')[0];
      const volume = Math.max(0, Number(volumeMap.get(key) ?? 0));
      const workoutType = workoutTypeByDate.get(key);
      
      points.push({
        date: key,
        volume,
        ...(workoutType && { workoutType }),
      });
    }

    return points;
  }, [volumeQuery.data, workoutsQuery.data]);

  const loading = volumeQuery.isLoading || workoutsQuery.isLoading;
  const error = volumeQuery.error || workoutsQuery.error;

  return {
    data: volumeData,
    loading,
    error: error as Error | null,
    refetch: async () => {
      await Promise.all([
        volumeQuery.refetch(),
        workoutsQuery.refetch(),
      ]);
    },
  };
};

export default useVolumeHistory;
