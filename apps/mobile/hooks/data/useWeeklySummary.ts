/**
 * useWeeklySummary Hook
 * Reactive hook for calculating weekly workout summary
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { database } from '../../app/_lib/database';
import type { DashboardWeeklySummary, DashboardWorkoutSummary } from '../../app/_contexts/data-context';

interface UseWeeklySummaryOptions {
  enabled?: boolean;
}

interface UseWeeklySummaryReturn {
  data: DashboardWeeklySummary | undefined;
  sessionsByWorkoutType: Record<string, DashboardWorkoutSummary[]>;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Helper to get start of week (Monday) in UTC
const getStartOfWeekUTC = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d;
};

// Helper to get end of week (Sunday) in UTC
const getEndOfWeekUTC = (startOfWeek: Date): Date => {
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
  endOfWeek.setUTCHours(23, 59, 59, 999);
  return endOfWeek;
};

/**
 * Hook to calculate weekly workout summary for a user
 * @param userId - The user's ID
 * @param programmeType - The programme type ('ppl' or 'ulul')
 * @param options - Optional configuration
 * @returns Weekly summary with loading/error states
 */
export const useWeeklySummary = (
  userId: string | null,
  programmeType: 'ppl' | 'ulul' = 'ppl',
  options: UseWeeklySummaryOptions = {}
): UseWeeklySummaryReturn => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['weekly-summary', userId, programmeType],
    queryFn: async () => {
      if (!userId) throw new Error('User ID required');
      
      // Get recent workouts (last 50 to ensure we capture all this week)
      const recentWorkouts = await database.getRecentWorkoutSummaries(userId, 50);
      
      // Calculate week boundaries
      const now = new Date();
      const startOfWeek = getStartOfWeekUTC(now);
      const endOfWeek = getEndOfWeekUTC(startOfWeek);
      
      // Filter to current week
      const currentWeekWorkouts = recentWorkouts.filter(({ session }) => {
        const workoutDate = new Date(session.completed_at || session.session_date);
        return workoutDate >= startOfWeek && workoutDate <= endOfWeek;
      });
      
      // Group by workout type (deduplicate by type)
      const workoutTypeMap = new Map<string, typeof recentWorkouts[0]>();
      currentWeekWorkouts.forEach((workout) => {
        const workoutType = workout.session.template_name?.toLowerCase() || 'ad-hoc';
        if (!workoutTypeMap.has(workoutType)) {
          workoutTypeMap.set(workoutType, workout);
        }
      });
      
      const uniqueWorkouts = Array.from(workoutTypeMap.values());
      
      // Build completed workouts list
      const completedWorkouts = uniqueWorkouts.map(({ session }) => ({
        id: session.id,
        name: session.template_name ?? 'Ad Hoc',
        sessionId: session.id,
      }));
      
      // Build sessions by workout type
      const sessionsByType: Record<string, DashboardWorkoutSummary[]> = {};
      currentWeekWorkouts.forEach(({ session, exercise_count, gym_name }) => {
        const workoutType = session.template_name?.toLowerCase() || 'ad-hoc';
        if (!sessionsByType[workoutType]) {
          sessionsByType[workoutType] = [];
        }
        sessionsByType[workoutType].push({
          id: session.id,
          template_name: session.template_name,
          session_date: session.session_date,
          completed_at: session.completed_at,
          duration_string: session.duration_string,
          exercise_count,
          gym_name,
        });
      });
      
      const goalTotal = programmeType === 'ulul' ? 4 : 3;
      
      return {
        summary: {
          completed_workouts: completedWorkouts,
          goal_total: goalTotal,
          programme_type: programmeType,
          total_sessions: currentWeekWorkouts.length,
        } as DashboardWeeklySummary,
        sessionsByType,
      };
    },
    enabled: !!userId && enabled,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const sessionsByWorkoutType = useMemo(() => {
    return query.data?.sessionsByType ?? {};
  }, [query.data?.sessionsByType]);

  return {
    data: query.data?.summary,
    sessionsByWorkoutType,
    loading: query.isLoading,
    error: query.error,
    refetch: async () => {
      await query.refetch();
    },
  };
};

export default useWeeklySummary;
