"use client";

import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, WorkoutExercise } from '@/types/supabase';
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { db, LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

interface WorkoutWithLastCompleted extends TPath {
  last_completed_at: string | null;
}

interface GroupedTPath {
  mainTPath: TPath;
  childWorkouts: WorkoutWithLastCompleted[];
}

interface UseWorkoutDataFetcherReturn {
  allAvailableExercises: ExerciseDefinition[];
  groupedTPaths: GroupedTPath[];
  workoutExercisesCache: Record<string, WorkoutExercise[]>;
  loadingData: boolean;
  dataError: string | null;
  refreshAllData: () => void;
}

export const useWorkoutDataFetcher = (): UseWorkoutDataFetcherReturn => {
  const { session, supabase } = useSession();

  const [allAvailableExercises, setAllAvailableExercises] = useState<ExerciseDefinition[]>([]);
  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);
  const [workoutExercisesCache, setWorkoutExercisesCache] = useState<Record<string, WorkoutExercise[]>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Use the caching hook for exercises
  const { data: cachedExercises, loading: loadingExercises, error: exercisesError, refresh: refreshExercises } = useCacheAndRevalidate<LocalExerciseDefinition>({
    cacheTable: 'exercise_definitions_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      return client
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, library_id, is_favorite, created_at, user_id, icon_url')
        .order('name', { ascending: true });
    }, []),
    queryKey: 'all_exercises',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  // Use the caching hook for T-Paths
  const { data: cachedTPaths, loading: loadingTPaths, error: tPathsError, refresh: refreshTPaths } = useCacheAndRevalidate<LocalTPath>({
    cacheTable: 't_paths_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      return client
        .from('t_paths')
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id');
    }, []),
    queryKey: 'all_t_paths',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  // New: Use the caching hook for Profiles
  const { data: cachedProfile, loading: loadingProfile, error: profileError, refresh: refreshProfile } = useCacheAndRevalidate<LocalProfile>({
    cacheTable: 'profiles_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id);
      return { data: data || [], error };
    }, [session?.user.id]),
    queryKey: 'user_profile',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  // New: Use the caching hook for T-Path Exercises
  const { data: cachedTPathExercises, loading: loadingTPathExercises, error: tPathExercisesError, refresh: refreshTPathExercises } = useCacheAndRevalidate<LocalTPathExercise>({
    cacheTable: 't_path_exercises_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      const { data, error } = await client
        .from('t_path_exercises')
        .select('id, exercise_id, template_id, order_index, is_bonus_exercise, created_at');
      return { data: data || [], error };
    }, [session?.user.id]),
    queryKey: 'all_t_path_exercises',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  // Effect to process cached data and then trigger enrichment
  useEffect(() => {
    const processAndEnrichData = async () => {
      const isLoading = loadingExercises || loadingTPaths || loadingProfile || loadingTPathExercises;
      const anyError = exercisesError || tPathsError || profileError || tPathExercisesError;

      if (isLoading) {
        setLoadingData(true);
        return;
      }

      if (anyError) {
        setDataError(anyError);
        setLoadingData(false);
        console.error("Data fetching error:", anyError);
        toast.error("Failed to load workout data from cache.");
        return;
      }

      if (!session?.user.id || !cachedProfile || cachedProfile.length === 0) {
        setLoadingData(false); // Not loading, just no user/profile yet
        return;
      }

      // --- Start Data Processing ---
      setAllAvailableExercises(cachedExercises as ExerciseDefinition[]);
      
      const userProfile = cachedProfile[0];
      const activeTPathId = userProfile.active_t_path_id;

      if (!activeTPathId) {
        setGroupedTPaths([]);
        setWorkoutExercisesCache({});
        setLoadingData(false);
        return;
      }

      const activeMainTPath = (cachedTPaths || []).find(tp => tp.id === activeTPathId);

      if (!activeMainTPath) {
        console.warn("Active T-Path ID found in profile, but T-Path itself not found in cache.");
        setGroupedTPaths([]);
        setWorkoutExercisesCache({});
        setLoadingData(false);
        return;
      }

      const childWorkouts = (cachedTPaths || []).filter(tp => tp.parent_t_path_id === activeMainTPath.id && tp.is_bonus);

      const exerciseDefMap = new Map<string, ExerciseDefinition>();
      (cachedExercises || []).forEach(def => exerciseDefMap.set(def.id, def as ExerciseDefinition));

      const newWorkoutExercisesCache: Record<string, WorkoutExercise[]> = {};
      for (const workout of childWorkouts) {
        const exercisesForWorkout = (cachedTPathExercises || [])
          .filter(tpe => tpe.template_id === workout.id)
          .sort((a, b) => a.order_index - b.order_index)
          .map(tpe => {
            const exerciseDef = exerciseDefMap.get(tpe.exercise_id);
            if (!exerciseDef) return null;
            return { ...exerciseDef, is_bonus_exercise: tpe.is_bonus_exercise || false };
          })
          .filter(Boolean) as WorkoutExercise[];
        newWorkoutExercisesCache[workout.id] = exercisesForWorkout;
      }

      setWorkoutExercisesCache(newWorkoutExercisesCache);

      // Enrich child workouts with last completed date
      try {
        const enrichedChildWorkouts = await Promise.all(
          childWorkouts.map(async (workout) => {
            const { data: lastSessionDate, error: rpcError } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
            if (rpcError) {
              console.error(`Error fetching last completed date for workout ${workout.id}:`, rpcError);
            }
            return { ...workout, last_completed_at: lastSessionDate?.[0]?.session_date || null };
          })
        );

        setGroupedTPaths([{
          mainTPath: activeMainTPath,
          childWorkouts: enrichedChildWorkouts,
        }]);
      } catch (enrichError: any) {
        console.error("Failed to enrich workout data:", enrichError);
        toast.error("Could not load workout completion dates.");
        // Set data anyway, just without completion dates
        setGroupedTPaths([{
          mainTPath: activeMainTPath,
          childWorkouts: childWorkouts.map(cw => ({ ...cw, last_completed_at: null })),
        }]);
      }

      setLoadingData(false);
      setDataError(null);
    };

    processAndEnrichData();
  }, [
    session, supabase,
    cachedExercises, loadingExercises, exercisesError,
    cachedTPaths, loadingTPaths, tPathsError,
    cachedProfile, loadingProfile, profileError,
    cachedTPathExercises, loadingTPathExercises, tPathExercisesError
  ]);

  const refreshAllData = useCallback(() => {
    refreshExercises();
    refreshTPaths();
    refreshProfile();
    refreshTPathExercises();
  }, [refreshExercises, refreshTPaths, refreshProfile, refreshTPathExercises]);

  return {
    allAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    loadingData,
    dataError,
    refreshAllData,
  };
};