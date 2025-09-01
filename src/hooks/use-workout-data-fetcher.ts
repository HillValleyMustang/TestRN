"use client";

import { useState, useEffect, useCallback, useRef } from 'react'; // Import useRef
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, WorkoutExercise } from '@/types/supabase';
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { getMaxMinutes } from '@/lib/utils';

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
      // Fetch only the current user's profile
      if (!session?.user.id) return { data: [], error: null };
      const { data, error } = await client
        .from('profiles')
        .select('*') // Select all columns required by LocalProfile
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
      // Fetch all t_path_exercises for all user's T-Paths
      if (!session?.user.id) return { data: [], error: null };
      const { data, error } = await client
        .from('t_path_exercises')
        .select('id, exercise_id, template_id, order_index, is_bonus_exercise, created_at'); // Select all columns required by LocalTPathExercise
      return { data: data || [], error };
    }, [session?.user.id]),
    queryKey: 'all_t_path_exercises',
    supabase,
    sessionUserId: session?.user.id ?? null, // This is a global cache, but tied to user session for revalidation
  });

  // Ref to track if initial cached data has been processed
  const hasProcessedInitialDataRef = useRef(false);

  // Phase 1: Process initial cached data (fast, no network calls)
  const processInitialCachedData = useCallback(() => {
    // Ensure all necessary cached data is available and not undefined
    if (
      cachedExercises === undefined || cachedTPaths === undefined || cachedProfile === undefined || cachedTPathExercises === undefined
    ) {
      console.log("[WorkoutDataFetcher] processInitialCachedData: Missing cached data (undefined), returning early.");
      return;
    }

    // Prevent re-processing if already done
    if (hasProcessedInitialDataRef.current) {
      return;
    }
    
    // Explicitly check for null/empty arrays for all critical data
    if (!session?.user.id || !cachedProfile || cachedProfile.length === 0 || !cachedExercises || !cachedTPaths || !cachedTPathExercises) {
      console.log("[WorkoutDataFetcher] processInitialCachedData: No user session or profile/cached data in cache, cannot determine active T-Path. Keeping loadingData=true.");
      // Do NOT set hasProcessedInitialDataRef.current = true here.
      // Do NOT set setLoadingData(false) here.
      return;
    }

    hasProcessedInitialDataRef.current = true; // Mark as processed

    setAllAvailableExercises(cachedExercises as ExerciseDefinition[]);
    
    const userProfile = cachedProfile[0]; // Now guaranteed to be safe to access
    const activeTPathId = userProfile.active_t_path_id;
    const preferredSessionLength = userProfile.preferred_session_length;
    const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);
    console.log("[WorkoutDataFetcher] processInitialCachedData: userProfile:", userProfile);
    console.log("[WorkoutDataFetcher] processInitialCachedData: activeTPathId:", activeTPathId, "maxAllowedMinutes:", maxAllowedMinutes);

    const newGroupedTPaths: GroupedTPath[] = [];
    const newWorkoutExercisesCache: Record<string, WorkoutExercise[]> = {};

    if (activeTPathId && session?.user.id) {
      const activeMainTPath = cachedTPaths.find(tp => tp.id === activeTPathId && tp.user_id === session.user.id && tp.parent_t_path_id === null);
      console.log("[WorkoutDataFetcher] processInitialCachedData: activeMainTPath:", activeMainTPath);

      if (activeMainTPath) {
        const allChildWorkouts = cachedTPaths.filter(tp => tp.parent_t_path_id === activeMainTPath.id && tp.is_bonus === true);
        console.log("[WorkoutDataFetcher] processInitialCachedData: allChildWorkouts:", allChildWorkouts);

        const filteredChildWorkouts: WorkoutWithLastCompleted[] = [];

        for (const workout of allChildWorkouts) {
          const tPathExercisesForWorkout = cachedTPathExercises.filter(tpe => tpe.template_id === workout.id);
          console.log(`[WorkoutDataFetcher] processInitialCachedData: tPathExercisesForWorkout for ${workout.template_name}:`, tPathExercisesForWorkout);
          
          const exercisesForWorkout: WorkoutExercise[] = tPathExercisesForWorkout
            .map(tpe => {
              const exerciseDef = cachedExercises.find(ex => ex.id === tpe.exercise_id);
              if (!exerciseDef) {
                console.warn(`[WorkoutDataFetcher] processInitialCachedData: Exercise definition not found for ID ${tpe.exercise_id} in workout ${workout.template_name}.`);
                return null;
              }
              return { ...exerciseDef, is_bonus_exercise: tpe.is_bonus_exercise || false };
            })
            .filter(Boolean) as WorkoutExercise[];

          console.log(`[WorkoutDataFetcher] processInitialCachedData: exercisesForWorkout.length for ${workout.template_name}:`, exercisesForWorkout.length);

          // Only include workouts that actually have exercises after filtering by session length
          if (exercisesForWorkout.length > 0) {
            filteredChildWorkouts.push({ ...workout, last_completed_at: null }); // last_completed_at will be enriched later
            newWorkoutExercisesCache[workout.id] = exercisesForWorkout.sort((a, b) => {
              const orderA = tPathExercisesForWorkout.find(tpe => tpe.exercise_id === a.id)?.order_index || 0;
              const orderB = tPathExercisesForWorkout.find(tpe => tpe.exercise_id === b.id)?.order_index || 0;
              return orderA - orderB;
            });
          }
        }
        newGroupedTPaths.push({
          mainTPath: activeMainTPath,
          childWorkouts: filteredChildWorkouts,
        });
      } else {
        console.log("[WorkoutDataFetcher] processInitialCachedData: No activeMainTPath found for activeTPathId:", activeTPathId);
      }
    } else {
      console.log("[WorkoutDataFetcher] processInitialCachedData: No activeTPathId or session.user.id available.");
    }
    setGroupedTPaths(newGroupedTPaths);
    setWorkoutExercisesCache(newWorkoutExercisesCache);
    setLoadingData(false); // Crucially, set loading to false here!
    setDataError(exercisesError || tPathsError || profileError || tPathExercisesError); // Propagate any initial errors

  }, [session, cachedExercises, cachedTPaths, cachedProfile, cachedTPathExercises, exercisesError, tPathsError, profileError, tPathExercisesError]);

  // Phase 2: Enrich data with network calls (runs in background)
  const enrichDataWithNetworkCalls = useCallback(async () => {
    if (!session) return; // Ensure session exists before making network calls

    // Explicitly check for null/empty arrays for all critical data
    if (!cachedProfile || cachedProfile.length === 0 || !cachedExercises || !cachedTPaths || !cachedTPathExercises) {
      console.log("[WorkoutDataFetcher] enrichDataWithNetworkCalls: Missing cached data (null or empty), skipping enrichment.");
      return;
    }

    const userProfile = cachedProfile[0]; // Now guaranteed to be safe to access
    if (!userProfile) { // Double check, though previous check should cover
      console.log("[WorkoutDataFetcher] enrichDataWithNetworkCalls: userProfile is empty or null, skipping enrichment.");
      return;
    }

    try {
      // Re-fetch profile and t_path_exercises to ensure caches are up-to-date
      await refreshProfile();
      await refreshTPathExercises();

      const activeTPathId = userProfile.active_t_path_id; // Access directly after null check

      if (!activeTPathId) return;

      const activeMainTPath = cachedTPaths.find(tp => tp.id === activeTPathId && tp.user_id === session.user.id && tp.parent_t_path_id === null);
      if (!activeMainTPath) return;

      const allChildWorkouts = cachedTPaths.filter(tp => tp.parent_t_path_id === activeMainTPath.id && tp.is_bonus === true);

      const updatedChildWorkouts: WorkoutWithLastCompleted[] = [];
      for (const workout of allChildWorkouts) {
        const { data: lastSessionDate } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
        updatedChildWorkouts.push({ ...workout, last_completed_at: lastSessionDate?.[0]?.session_date || null });
      }

      // Update groupedTPaths with the newly fetched last_completed_at dates
      setGroupedTPaths(prev => prev.map(group => 
        group.mainTPath.id === activeMainTPath.id 
          ? { ...group, childWorkouts: updatedChildWorkouts } 
          : group
      ));

    } catch (err: any) {
      console.error("Error during background data enrichment:", err);
      if (!dataError) setDataError(err.message || "Failed to fully load workout data.");
    }
  }, [session, supabase, cachedExercises, cachedTPaths, cachedProfile, cachedTPathExercises, dataError, refreshProfile, refreshTPathExercises]);

  useEffect(() => {
    // Trigger initial fast load as soon as cached data is available
    // and only if it hasn't been processed yet.
    if (
      cachedExercises !== undefined && cachedTPaths !== undefined && cachedProfile !== undefined && cachedTPathExercises !== undefined
    ) {
      processInitialCachedData();
      // Then, trigger background enrichment
      enrichDataWithNetworkCalls();
    }
  }, [processInitialCachedData, enrichDataWithNetworkCalls, cachedExercises, cachedTPaths, cachedProfile, cachedTPathExercises]);

  const refreshAllData = useCallback(() => {
    // Reset the ref so initial processing runs again on explicit refresh
    hasProcessedInitialDataRef.current = false; 
    refreshExercises();
    refreshTPaths();
    refreshProfile();
    refreshTPathExercises();
    // The useEffect will then pick up the refreshed cached data and re-run initial processing + background enrichment
  }, [refreshExercises, refreshTPaths, refreshProfile, refreshTPathExercises, enrichDataWithNetworkCalls]);

  return {
    allAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    loadingData,
    dataError,
    refreshAllData,
  };
};