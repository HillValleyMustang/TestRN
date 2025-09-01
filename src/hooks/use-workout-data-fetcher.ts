"use client";

import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, WorkoutExercise } from '@/types/supabase';
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

  // Phase 1: Process initial cached data (fast, no network calls)
  const processInitialCachedData = useCallback(() => {
    if (cachedExercises === undefined || cachedTPaths === undefined) return;
    if (!cachedTPaths) return; // Add null check for cachedTPaths

    setAllAvailableExercises(cachedExercises as ExerciseDefinition[]);
    
    // Create a basic groupedTPaths structure without network-dependent details
    const newGroupedTPaths: GroupedTPath[] = [];
    const mainTPaths = cachedTPaths.filter(tp => tp.parent_t_path_id === null && tp.user_id === session?.user.id);
    mainTPaths.forEach(mainTPath => {
      const childWorkouts = cachedTPaths.filter(tp => tp.parent_t_path_id === mainTPath.id && tp.is_bonus === true);
      newGroupedTPaths.push({
        mainTPath: mainTPath,
        childWorkouts: childWorkouts.map(cw => ({ ...cw, last_completed_at: null })), // last_completed_at will be enriched later
      });
    });
    setGroupedTPaths(newGroupedTPaths);
    setLoadingData(false); // Crucially, set loading to false here!
    setDataError(exercisesError || tPathsError); // Propagate any initial errors

  }, [session, cachedExercises, cachedTPaths, exercisesError, tPathsError]);

  // Phase 2: Enrich data with network calls (runs in background)
  const enrichDataWithNetworkCalls = useCallback(async () => {
    if (!session || !cachedExercises || !cachedTPaths) return; // Add null check for cachedTPaths

    try {
      // Fetch user's profile to get active_t_path_id
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_t_path_id')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching active T-Path ID from profile:", profileError);
        // Don't set dataError here, as initial data is already displayed.
        // This error is for background enrichment.
        return;
      }

      const activeTPathId = profileData?.active_t_path_id;

      const newGroupedTPaths: GroupedTPath[] = [];
      const mainTPaths = cachedTPaths.filter(tp => tp.parent_t_path_id === null && tp.user_id === session.user.id);

      const newWorkoutExercisesCache: Record<string, WorkoutExercise[]> = {};

      for (const mainTPath of mainTPaths) {
        const allChildWorkouts = cachedTPaths.filter(tp => tp.parent_t_path_id === mainTPath.id && tp.is_bonus === true);

        const workoutsWithLastDatePromises = allChildWorkouts.map(async (workout) => {
          const { data: lastSessionDate } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
          return { ...workout, last_completed_at: lastSessionDate?.[0]?.session_date || null };
        });
        const allChildWorkoutsWithLastDate = await Promise.all(workoutsWithLastDatePromises);

        // Also fetch exercises for each workout and populate cache
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
          
          const mappedExercises: WorkoutExercise[] = cachedExercises
            .filter(ex => exerciseIds.includes(ex.id))
            .map((ex: LocalExerciseDefinition) => ({ ...ex, is_bonus_exercise: exerciseInfoMap.get(ex.id)?.is_bonus_exercise || false })) as WorkoutExercise[];
          
          const exercisesForWorkout = mappedExercises.sort((a: WorkoutExercise, b: WorkoutExercise) => (exerciseInfoMap.get(a.id)?.order_index || 0) - (exerciseInfoMap.get(b.id)?.order_index || 0));
          
          newWorkoutExercisesCache[workout.id] = exercisesForWorkout;
        }

        newGroupedTPaths.push({
          mainTPath: mainTPath,
          childWorkouts: allChildWorkoutsWithLastDate,
        });
      }
      setGroupedTPaths(newGroupedTPaths);
      setWorkoutExercisesCache(newWorkoutExercisesCache);

    } catch (err: any) {
      console.error("Error during background data enrichment:", err);
      // Only set dataError if it's not already set by initial load, or if it's a critical error
      if (!dataError) setDataError(err.message || "Failed to fully load workout data.");
    }
  }, [session, supabase, cachedExercises, cachedTPaths, dataError]);

  useEffect(() => {
    // Trigger initial fast load as soon as cached data is available
    if (cachedExercises !== undefined && cachedTPaths !== undefined) {
      processInitialCachedData();
      // Then, trigger background enrichment
      enrichDataWithNetworkCalls();
    }
  }, [processInitialCachedData, enrichDataWithNetworkCalls, cachedExercises, cachedTPaths]);

  const refreshAllData = useCallback(() => {
    refreshExercises();
    refreshTPaths();
    // After refreshing cache, re-trigger enrichment to get latest network data
    enrichDataWithNetworkCalls();
  }, [refreshExercises, refreshTPaths, enrichDataWithNetworkCalls]);

  return {
    allAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    loadingData,
    dataError,
    refreshAllData,
  };
};