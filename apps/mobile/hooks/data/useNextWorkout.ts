/**
 * useNextWorkout Hook
 * Reactive hook for determining the next recommended workout
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { database } from '../../app/_lib/database';
import { WeeklyWorkoutAnalyzer } from '@data/ai/weekly-workout-analyzer';
import type { DashboardProgram } from '../../app/_contexts/data-context';

interface UseNextWorkoutOptions {
  enabled?: boolean;
}

interface UseNextWorkoutReturn {
  data: DashboardProgram | null | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to determine the next recommended workout
 * @param userId - The user's ID
 * @param activeTPathId - The active T-Path ID
 * @param programmeType - The programme type ('ppl' or 'ulul')
 * @param options - Optional configuration
 * @returns Next workout recommendation with loading/error states
 */
export const useNextWorkout = (
  userId: string | null,
  activeTPathId: string | null,
  programmeType: 'ppl' | 'ulul' = 'ppl',
  options: UseNextWorkoutOptions = {}
): UseNextWorkoutReturn => {
  const { enabled = true } = options;

  const query = useQuery({
    queryKey: ['next-workout', userId, activeTPathId, programmeType],
    queryFn: async (): Promise<DashboardProgram | null> => {
      if (!userId || !activeTPathId) return null;

      // Fetch recent workouts
      const recentWorkouts = await database.getRecentWorkoutSummaries(userId, 50);
      
      // Fetch T-Path workouts (children of active T-Path)
      const rawTPathWorkouts = await database.getTPathsByParent(activeTPathId);
      
      // Deduplicate by template_name to only include unique workout templates
      // This is critical because getTPathsByParent can return many generated workouts
      const uniqueTPathWorkoutsMap = new Map<string, typeof rawTPathWorkouts[0]>();
      rawTPathWorkouts.forEach(workout => {
        const normalizedName = workout.template_name?.trim().toLowerCase();
        if (normalizedName && !uniqueTPathWorkoutsMap.has(normalizedName)) {
          uniqueTPathWorkoutsMap.set(normalizedName, workout);
        }
      });
      const tPathWorkouts = Array.from(uniqueTPathWorkoutsMap.values());
      
      // Calculate week boundaries for completed workouts (using local time)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
      const startOfWeek = new Date(now);
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust so Monday is 1
      startOfWeek.setDate(now.getDate() - daysToSubtract);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      // Filter to current week and deduplicate by workout type
      // Sort currentWeekWorkouts by date descending to ensure the most recent is first
      const currentWeekWorkouts = recentWorkouts
        .filter(({ session }) => {
          const workoutDate = new Date(session.completed_at || session.session_date);
          return workoutDate >= startOfWeek && workoutDate <= endOfWeek;
        })
        .sort((a, b) => {
          const dateA = new Date(a.session.completed_at || a.session.session_date);
          const dateB = new Date(b.session.completed_at || b.session.session_date);
          return dateB.getTime() - dateA.getTime();
        });
      
      const workoutTypeMap = new Map<string, typeof recentWorkouts[0]>();
      currentWeekWorkouts.forEach((workout) => {
        const workoutType = workout.session.template_name?.toLowerCase() || 'ad-hoc';
        if (!workoutTypeMap.has(workoutType)) {
          workoutTypeMap.set(workoutType, workout);
        }
      });
      
      const uniqueWorkouts = Array.from(workoutTypeMap.values());
      const completedWorkoutsThisWeek = uniqueWorkouts.map(({ session }) => ({
        id: session.id,
        name: session.template_name ?? 'Ad Hoc',
        sessionId: session.id,
      }));

      // Use WeeklyWorkoutAnalyzer to determine next workout
      const nextWorkout = WeeklyWorkoutAnalyzer.determineNextWorkoutWeeklyAware(
        programmeType,
        recentWorkouts.map(w => ({
          session: w.session,
          exercise_count: w.exercise_count,
          first_set_at: null,
          last_set_at: null,
        })),
        tPathWorkouts,
        completedWorkoutsThisWeek
      );

      if (!nextWorkout) return null;

      return {
        id: nextWorkout.id,
        template_name: nextWorkout.template_name,
        description: nextWorkout.description || null,
        parent_t_path_id: nextWorkout.parent_t_path_id || null,
        recommendationReason: nextWorkout.recommendationReason,
      };
    },
    enabled: !!userId && !!activeTPathId && enabled,
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

export default useNextWorkout;
