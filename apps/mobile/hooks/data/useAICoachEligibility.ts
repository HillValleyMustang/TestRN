/**
 * useAICoachEligibility Hook
 * Checks if user meets requirements for AI Coach (6 workouts AND 30 days)
 * Following mobile reactive hooks pattern (React Query)
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../app/_contexts/auth-context';

const MIN_WORKOUTS = 6;
const MIN_DAYS = 30;

// DEV ONLY: Set to true to force ineligible state for testing unlock screen
const FORCE_INELIGIBLE_FOR_TESTING = false;

interface EligibilityData {
  workoutCount: number;
  daysSinceFirstWorkout: number;
  firstWorkoutDate: string | null;
  isEligible: boolean;
  workoutsRemaining: number;
  daysRemaining: number;
  blockingRequirement: 'workouts' | 'days' | null;
  showPulse: boolean;
}

export function useAICoachEligibility() {
  const { supabase, userId } = useAuth();

  return useQuery({
    queryKey: ['aiCoachEligibility', userId],
    queryFn: async (): Promise<EligibilityData> => {
      if (!userId) {
        return {
          workoutCount: 0,
          daysSinceFirstWorkout: 0,
          firstWorkoutDate: null,
          isEligible: false,
          workoutsRemaining: MIN_WORKOUTS,
          daysRemaining: MIN_DAYS,
          blockingRequirement: 'workouts',
          showPulse: false,
        };
      }

      // Get total workout count
      const { count: workoutCount, error: countError } = await supabase
        .from('workout_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) {
        console.error('[useAICoachEligibility] Error fetching workout count:', countError);
        throw countError;
      }

      // Get first workout date
      const { data: firstWorkout, error: firstWorkoutError } = await supabase
        .from('workout_sessions')
        .select('session_date')
        .eq('user_id', userId)
        .order('session_date', { ascending: true })
        .limit(1)
        .single();

      if (firstWorkoutError && firstWorkoutError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (acceptable for new users)
        console.error('[useAICoachEligibility] Error fetching first workout:', firstWorkoutError);
        throw firstWorkoutError;
      }

      const totalWorkouts = workoutCount || 0;
      const firstDate = firstWorkout?.session_date;

      // Calculate days since first workout
      let daysSinceFirst = 0;
      if (firstDate) {
        const firstWorkoutDate = new Date(firstDate);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - firstWorkoutDate.getTime());
        daysSinceFirst = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      // Calculate eligibility
      const workoutsRemaining = Math.max(0, MIN_WORKOUTS - totalWorkouts);
      const daysRemaining = Math.max(0, MIN_DAYS - daysSinceFirst);
      let isEligible = totalWorkouts >= MIN_WORKOUTS && daysSinceFirst >= MIN_DAYS;

      // DEV ONLY: Override for testing
      if (__DEV__ && FORCE_INELIGIBLE_FOR_TESTING) {
        isEligible = false;
      }

      // Determine blocking requirement (whichever is further from completion)
      let blockingRequirement: 'workouts' | 'days' | null = null;
      if (!isEligible) {
        if (workoutsRemaining > 0 && daysRemaining > 0) {
          // Both blocking - choose the one that's further away
          blockingRequirement = workoutsRemaining > daysRemaining ? 'workouts' : 'days';
        } else if (workoutsRemaining > 0) {
          blockingRequirement = 'workouts';
        } else if (daysRemaining > 0) {
          blockingRequirement = 'days';
        }
      }

      return {
        workoutCount: totalWorkouts,
        daysSinceFirstWorkout: daysSinceFirst,
        firstWorkoutDate: firstDate || null,
        isEligible,
        workoutsRemaining,
        daysRemaining,
        blockingRequirement,
        showPulse: totalWorkouts >= MIN_WORKOUTS - 2, // Show pulse when 2 away
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes (eligibility doesn't change frequently)
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
