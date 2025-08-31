"use client";

import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, WorkoutExercise } from '@/types/supabase'; // Import WorkoutExercise
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { LocalExerciseDefinition, LocalTPath } from '@/lib/db';
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
  workoutExercisesCache: Record<string, WorkoutExercise[]>; // Corrected type here
  loadingData: boolean;
  dataError: string | null;
  refreshAllData: () => void;
}

export const useWorkoutDataFetcher = (): UseWorkoutDataFetcherReturn => {
  const { session, supabase } = useSession();

  const [allAvailableExercises, setAllAvailableExercises] = useState<ExerciseDefinition[]>([]);
  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);
  const [workoutExercisesCache, setWorkoutExercisesCache] = useState<Record<string, WorkoutExercise[]>>({}); // Corrected type here
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

  const processCachedData = useCallback(async () => {
    if (!session || loadingExercises || loadingTPaths) return;

    setLoadingData(true);
    setDataError(exercisesError || tPathsError);

    if (cachedExercises && cachedTPaths) {
      setAllAvailableExercises(cachedExercises as ExerciseDefinition[]);

      // Fetch user's profile to get active_t_path_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_t_path_id')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching active T-Path ID from profile:", profileError);
        setDataError("Could not load your active workout plan.");
        setLoadingData(false);
        return;
      }

      const activeTPathId = profileData?.active_t_path_id;

      if (!activeTPathId) {
        console.warn("User has no active T-Path set in their profile.");
        setGroupedTPaths([]);
        setLoadingData(false);
        return;
      }

      // Find the single active main T-Path from the cache
      const activeMainTPath = cachedTPaths.find(tp => tp.id === activeTPathId && tp.user_id === session.user.id && tp.parent_t_path_id === null);

      if (!activeMainTPath) {
        console.warn(`Active T-Path with ID ${activeTPathId} not found in cache or is not a main T-Path.`);
        setGroupedTPaths([]);
        setLoadingData(false);
        return;
      }

      // Find child workouts for ONLY the active main T-Path
      const allChildWorkouts = cachedTPaths.filter(tp => tp.parent_t_path_id === activeMainTPath.id && tp.is_bonus === true);

      const workoutsWithLastDatePromises = allChildWorkouts.map(async (workout) => {
        const { data: lastSessionDate } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
        return { ...workout, last_completed_at: lastSessionDate?.[0]?.session_date || null };
      });
      const allChildWorkoutsWithLastDate = await Promise.all(workoutsWithLastDatePromises);

      // Create the grouped structure for just the one active path
      const newGroupedTPaths: GroupedTPath[] = [{
        mainTPath: activeMainTPath,
        childWorkouts: allChildWorkoutsWithLastDate,
      }];
      
      setGroupedTPaths(newGroupedTPaths);

      const newWorkoutExercisesCache: Record<string, WorkoutExercise[]> = {};
      for (const workout of allChildWorkouts) {
        const { data: tPathExercises, error: fetchLinksError } = await supabase
          .from('t_path_exercises')
          .select('exercise_id, is_bonus_exercise, order_index')
          .eq('template_id', workout.id)
          .order('order_index', { ascending: true });
        
        if (fetchLinksError) {
          console.error(`Error fetching t_path_exercises for workout ${workout.id}:`, fetchLinksError);
          newWorkoutExercisesCache[workout.id] = [];
          continue;
        }

        if (!tPathExercises || tPathExercises.length === 0) {
          newWorkoutExercisesCache[workout.id] = [];
          continue;
        }

        const exerciseIds = tPathExercises.map(e => e.exercise_id);
        const exerciseInfoMap = new Map(tPathExercises.map(e => [e.exercise_id, { is_bonus_exercise: !!e.is_bonus_exercise, order_index: e.order_index }]));
        
        const exercisesForWorkout = cachedExercises
          .filter(ex => exerciseIds.includes(ex.id))
          .map((ex: LocalExerciseDefinition) => ({ ...ex, is_bonus_exercise: exerciseInfoMap.get(ex.id)?.is_bonus_exercise || false })) as WorkoutExercise[]
          .sort((a: WorkoutExercise, b: WorkoutExercise) => (exerciseInfoMap.get(a.id)?.order_index || 0) - (exerciseInfoMap.get(b.id)?.order_index || 0));
        
        newWorkoutExercisesCache[workout.id] = exercisesForWorkout;
      }
      setWorkoutExercisesCache(newWorkoutExercisesCache);
    } // This was the missing brace
    setLoadingData(false);
  }, [session, supabase, cachedExercises, cachedTPaths, loadingExercises, loadingTPaths, exercisesError, tPathsError]);

  useEffect(() => {
    if (!loadingExercises && !loadingTPaths) {
      processCachedData();
    }
  }, [processCachedData, loadingExercises, loadingTPaths]);

  const refreshAllData = useCallback(() => {
    refreshExercises();
    refreshTPaths();
  }, [refreshExercises, refreshTPaths]);

  return {
    allAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    loadingData,
    dataError,
    refreshAllData,
  };
};