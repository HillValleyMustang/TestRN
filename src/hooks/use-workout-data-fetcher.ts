"use client";

import { useState, useEffect, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, WorkoutExercise } from '@/types/supabase';
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { db, LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise } from '@/lib/db';
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
      if (
        cachedExercises === undefined || cachedTPaths === undefined || cachedProfile === undefined || cachedTPathExercises === undefined ||
        cachedExercises === null || cachedTPaths === null || cachedProfile === null || cachedTPathExercises === null
      ) {
        return;
      }

      if (!session?.user.id || cachedProfile.length === 0) {
        setLoadingData(true);
        return;
      }
      
      setAllAvailableExercises(cachedExercises as ExerciseDefinition[]);
      
      const userProfile = cachedProfile[0];
      const activeTPathId = userProfile.active_t_path_id;

      const newGroupedTPaths: GroupedTPath[] = [];
      const newWorkoutExercisesCache: Record<string, WorkoutExercise[]> = {};

      if (activeTPathId) {
        const activeMainTPath = cachedTPaths.find(tp => tp.id === activeTPathId && tp.user_id === session.user.id && tp.parent_t_path_id === null);

        if (activeMainTPath) {
          const allChildWorkouts = cachedTPaths.filter(tp => tp.parent_t_path_id === activeMainTPath.id && tp.is_bonus === true);
          const filteredChildWorkouts: WorkoutWithLastCompleted[] = [];

          for (const workout of allChildWorkouts) {
            const tPathExercisesForWorkout = cachedTPathExercises.filter(tpe => tpe.template_id === workout.id);
            const exercisesForWorkout: WorkoutExercise[] = tPathExercisesForWorkout
              .map(tpe => {
                const exerciseDef = cachedExercises.find(ex => ex.id === tpe.exercise_id);
                if (!exerciseDef) return null;
                return { ...exerciseDef, is_bonus_exercise: tpe.is_bonus_exercise || false };
              })
              .filter(Boolean) as WorkoutExercise[];

            if (exercisesForWorkout.length > 0) {
              filteredChildWorkouts.push({ ...workout, last_completed_at: null });
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
        }
      }
      setGroupedTPaths(newGroupedTPaths);
      setWorkoutExercisesCache(newWorkoutExercisesCache);
      setLoadingData(false);
      setDataError(exercisesError || tPathsError || profileError || tPathExercisesError);

      // --- Enrichment Step ---
      if (newGroupedTPaths.length > 0) {
        try {
          const enrichedGroups = await Promise.all(
            newGroupedTPaths.map(async (group) => {
              const enrichedChildWorkouts = await Promise.all(
                group.childWorkouts.map(async (workout) => {
                  // Prioritize local DB for immediate feedback
                  const localSessions = await db.workout_sessions
                    .where('template_name').equals(workout.template_name)
                    .and(s => s.user_id === session.user.id && s.completed_at !== null)
                    .sortBy('completed_at');
                  
                  const lastLocalSession = localSessions.pop(); // Get the most recent one

                  // Fallback to RPC for initial load or if local data is missing
                  const { data: lastSessionDate } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
                  const rpcDate = lastSessionDate?.[0]?.session_date ? new Date(lastSessionDate[0].session_date) : null;
                  const localDate = lastLocalSession?.completed_at ? new Date(lastLocalSession.completed_at) : null;

                  let mostRecentDate = null;
                  if (rpcDate && localDate) {
                    mostRecentDate = rpcDate > localDate ? rpcDate : localDate;
                  } else {
                    mostRecentDate = rpcDate || localDate;
                  }

                  return { ...workout, last_completed_at: mostRecentDate ? mostRecentDate.toISOString() : null };
                })
              );
              return { ...group, childWorkouts: enrichedChildWorkouts };
            })
          );
          setGroupedTPaths(enrichedGroups);
        } catch (err: any) {
          console.error("Error during background data enrichment:", err);
          if (!dataError) setDataError(err.message || "Failed to fully load workout data.");
        }
      }
    };

    processAndEnrichData();
  }, [session, supabase, cachedExercises, cachedTPaths, cachedProfile, cachedTPathExercises, exercisesError, tPathsError, profileError, tPathExercisesError, dataError]);

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