"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, WorkoutExercise, WorkoutWithLastCompleted, GroupedTPath } from '@/types/supabase';
import { useCacheAndRevalidate } from '@/hooks/use-cache-and-revalidate';
import { db, LocalExerciseDefinition, LocalTPath, LocalTPathExercise } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { useUserProfile } from './useUserProfile';

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

const ULUL_ORDER = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
const PPL_ORDER = ['Push', 'Pull', 'Legs'];

/**
 * A centralized hook to fetch and process all user workout plans (T-Paths),
 * their child workouts, and the exercises within them.
 */
export const useWorkoutPlans = () => {
  const { session, supabase } = useSession();
  const { profile, isLoading: loadingProfile, error: profileError } = useUserProfile();

  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);
  const [workoutExercisesCache, setWorkoutExercisesCache] = useState<Record<string, WorkoutExercise[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: cachedExercises, loading: loadingExercises, error: exercisesError, refresh: refreshExercises } = useCacheAndRevalidate<LocalExerciseDefinition>({
    cacheTable: 'exercise_definitions_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => client.from('exercise_definitions').select('*').order('name', { ascending: true }), []),
    queryKey: 'all_exercises_for_plans',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const { data: cachedTPaths, loading: loadingTPaths, error: tPathsError, refresh: refreshTPaths } = useCacheAndRevalidate<LocalTPath>({
    cacheTable: 't_paths_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => client.from('t_paths').select('*'), []),
    queryKey: 'all_t_paths_for_plans',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const { data: cachedTPathExercises, loading: loadingTPathExercises, error: tPathExercisesError, refresh: refreshTPathExercises } = useCacheAndRevalidate<LocalTPathExercise>({
    cacheTable: 't_path_exercises_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      return client.from('t_path_exercises').select('*');
    }, [session?.user.id]),
    queryKey: 'all_t_path_exercises_for_plans',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const refresh = useCallback(async () => {
    await Promise.all([
      refreshExercises(),
      refreshTPaths(),
      refreshTPathExercises(),
    ]);
  }, [refreshExercises, refreshTPaths, refreshTPathExercises]);

  useEffect(() => {
    const overallLoading = loadingExercises || loadingTPaths || loadingProfile || loadingTPathExercises;
    setIsLoading(overallLoading);

    const anyError = exercisesError || tPathsError || profileError || tPathExercisesError;
    if (anyError) {
      setError(anyError);
      setIsLoading(false);
      return;
    }

    if (!overallLoading && session?.user.id) {
      const processData = async () => {
        try {
          const exerciseDefMap = new Map<string, ExerciseDefinition>();
          (cachedExercises || []).forEach(def => exerciseDefMap.set(def.id, def as ExerciseDefinition));

          const newWorkoutExercisesCache: Record<string, WorkoutExercise[]> = {};
          const allChildWorkouts = (cachedTPaths || []).filter(tp => tp.user_id === session.user.id && tp.parent_t_path_id);

          for (const workout of allChildWorkouts) {
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

          const userMainTPaths = (cachedTPaths || []).filter(tp => tp.user_id === session.user.id && !tp.parent_t_path_id);
          
          const newGroupedTPaths: GroupedTPath[] = await Promise.all(
            userMainTPaths.map(async (mainTPath) => {
              let childWorkouts = allChildWorkouts.filter(tp => tp.parent_t_path_id === mainTPath.id);
              
              const enrichedChildWorkouts = await Promise.all(
                childWorkouts.map(async (workout) => {
                  const { data: lastSessionDate, error: rpcError } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
                  if (rpcError) console.error(`Error fetching last completed date for workout ${workout.id}:`, rpcError);
                  return { ...workout, last_completed_at: lastSessionDate?.[0]?.last_completed_at || null };
                })
              );

              const tPathSettings = mainTPath.settings as { tPathType?: string };
              if (tPathSettings?.tPathType === 'ppl') {
                enrichedChildWorkouts.sort((a, b) => PPL_ORDER.indexOf(a.template_name) - PPL_ORDER.indexOf(b.template_name));
              } else if (tPathSettings?.tPathType === 'ulul') {
                enrichedChildWorkouts.sort((a, b) => ULUL_ORDER.indexOf(a.template_name) - ULUL_ORDER.indexOf(b.template_name));
              }

              return { mainTPath, childWorkouts: enrichedChildWorkouts };
            })
          );
          setGroupedTPaths(newGroupedTPaths);
          setError(null);
        } catch (err: any) {
          setError(err.message || "Failed to process workout plan data.");
        }
      };
      processData();
    }
  }, [
    session?.user.id, supabase,
    cachedExercises, loadingExercises, exercisesError,
    cachedTPaths, loadingTPaths, tPathsError,
    cachedTPathExercises, loadingTPathExercises, tPathExercisesError,
    profile, loadingProfile, profileError
  ]);

  return {
    groupedTPaths,
    workoutExercisesCache,
    isLoading,
    error,
    refresh,
  };
};