import { useState, useEffect, useMemo } from 'react';
import { database } from '../app/_lib/database';
import { useAuth } from '../app/_contexts/auth-context';
import { supabase } from '../app/_lib/supabase';

// Define types locally
interface TPath {
  id: string;
  user_id: string;
  template_name: string;
  description: string | null;
  is_main_program: boolean;
  parent_t_path_id: string | null;
  order_index: number | null;
  is_ai_generated: boolean;
  ai_generation_params: string | null;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  active_t_path_id: string | null;
  programme_type: string | null;
  preferred_session_length: number | null;
  created_at: string;
  updated_at: string;
}

interface UseWorkoutLauncherDataReturn {
  profile: Profile | null;
  activeTPath: TPath | null;
  childWorkouts: TPath[];
  adhocWorkouts: TPath[];
  workoutExercisesCache: Record<string, any[]>;
  lastCompletedDates: Record<string, Date | null>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useWorkoutLauncherData = (): UseWorkoutLauncherDataReturn => {
  const { userId } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tPaths, setTPaths] = useState<TPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  const refresh = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First sync from Supabase to ensure we have latest data
      // await syncFromSupabase(); // Temporarily disabled to avoid hanging - data is already in local DB

      // Fetch profile and TPaths in parallel
      const [profileData, tPathsData] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, active_t_path_id, programme_type, preferred_session_length, created_at, updated_at')
          .eq('id', userId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              return null;
            }
            // Add user_id to match our interface
            return data ? { ...data, user_id: userId } : null;
          }),
        database.getTPaths(userId),
      ]);

      setProfile(profileData);
      setTPaths(tPathsData);

      // Also refresh exercises after updating workouts
      const allWorkouts = tPathsData.filter(tp => !tp.is_main_program);
      const childWorkouts = profileData?.active_t_path_id
        ? allWorkouts.filter(tp => tp.parent_t_path_id === profileData.active_t_path_id)
        : [];

      // Only fetch exercises for child workouts (from active program)
      if (childWorkouts.length > 0) {
        const cache = await fetchWorkoutExercises(childWorkouts);
        setWorkoutExercisesCache(cache);
      } else {
        setWorkoutExercisesCache({});
      }
    } catch (err) {
      console.error('Error in refresh:', err);
      setError('Failed to load workout data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [userId]);

  // Compute derived data
  const derivedData = useMemo(() => {
    if (!profile) {
      return {
        activeTPath: null,
        childWorkouts: [],
        adhocWorkouts: [],
      };
    }

    if (!tPaths.length) {
      return {
        activeTPath: null,
        childWorkouts: [],
        adhocWorkouts: [],
      };
    }

    const activeTPath = tPaths.find(tp => tp.id === profile.active_t_path_id) || null;

    // Get all workouts that are not main programs
    const allWorkouts = tPaths.filter(tp => !tp.is_main_program);

    // Only show workouts that belong to the active program (PPL)
    // Don't show adhoc workouts or other standalone programs
    const childWorkouts = activeTPath
      ? allWorkouts.filter(tp => tp.parent_t_path_id === activeTPath.id)
      : [];

    // Don't show adhoc workouts - only show workouts from the active program
    const adhocWorkouts: TPath[] = [];

    return {
      activeTPath,
      childWorkouts,
      adhocWorkouts,
    };
  }, [profile, tPaths]);

  // Build workout exercises cache and last completed dates
  const [workoutExercisesCache, setWorkoutExercisesCache] = useState<Record<string, any[]>>({});
  const [lastCompletedDates] = useState<Record<string, Date | null>>({});

  const fetchWorkoutExercises = async (workouts: TPath[]): Promise<Record<string, any[]>> => {
    if (!userId) return {};

    const cache: Record<string, any[]> = {};

    for (const workout of workouts) {
      try {
        const exercises = await database.getTPathExercises(workout.id);
        const exerciseIds = exercises.map(ex => ex.exercise_id);

        if (exerciseIds.length > 0) {
          const exerciseDefs = await supabase
            .from('exercise_definitions')
            .select('id, name, main_muscle')
            .in('id', exerciseIds);

          const exerciseDefMap = new Map(
            exerciseDefs.data?.map(def => [def.id, def]) || []
          );

          const mappedExercises = exercises
            .sort((a, b) => a.order_index - b.order_index)
            .map(ex => {
              const def = exerciseDefMap.get(ex.exercise_id);
              return {
                id: ex.exercise_id,
                name: def?.name || `Exercise ${ex.exercise_id}`,
                main_muscle: def?.main_muscle || 'Unknown',
                target_sets: ex.target_sets || 3,
                target_reps_min: ex.target_reps_min || 8,
                target_reps_max: ex.target_reps_max || 12,
              };
            });

          cache[workout.id] = mappedExercises;
        } else {
          cache[workout.id] = [];
        }
      } catch (error) {
        console.error(`Failed to fetch exercises for workout ${workout.id}:`, error);
        cache[workout.id] = [];
      }
    }

    return cache;
  };

  // Remove this useEffect - exercises are now fetched synchronously in refresh()

  return {
    profile,
    activeTPath: derivedData.activeTPath,
    childWorkouts: derivedData.childWorkouts,
    adhocWorkouts: derivedData.adhocWorkouts,
    workoutExercisesCache,
    lastCompletedDates,
    loading,
    error,
    refresh,
  };
};