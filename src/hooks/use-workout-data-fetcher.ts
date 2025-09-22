"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, WorkoutExercise, WorkoutWithLastCompleted, GroupedTPath, LocalUserAchievement, Profile, FetchedExerciseDefinition } from '@/types/supabase';
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { db, LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise, LocalGymExercise } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { useUserProfile } from '@/hooks/data/useUserProfile';
import { useLiveQuery } from 'dexie-react-hooks';
import { getMaxMinutes } from '@/lib/utils'; // Import getMaxMinutes

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

const ULUL_ORDER = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
const PPL_ORDER = ['Push', 'Pull', 'Legs'];

interface UseWorkoutDataFetcherReturn {
  allAvailableExercises: FetchedExerciseDefinition[];
  groupedTPaths: GroupedTPath[];
  workoutExercisesCache: Record<string, WorkoutExercise[]>;
  loadingData: boolean;
  dataError: string | null;
  refreshAllData: () => Promise<void>;
  profile: Profile | null;
  refreshProfile: () => void;
  refreshAchievements: () => void;
  refreshTPaths: () => void;
  refreshTPathExercises: () => void;
  isGeneratingPlan: boolean;
  tempStatusMessage: { message: string; type: 'added' | 'removed' | 'success' } | null;
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' } | null) => void;
  availableMuscleGroups: string[];
  userGyms: Tables<'gyms'>[];
  exerciseGymsMap: Record<string, string[]>;
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>; // ADDED
}

export const useWorkoutDataFetcher = (): UseWorkoutDataFetcherReturn => {
  const { session, supabase } = useSession();
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const [tempStatusMessage, setTempStatusMessage] = useState<{ message: string; type: 'added' | 'removed' | 'success' } | null>(null);
  const [exerciseWorkoutsMap, setExerciseWorkoutsMap] = useState<Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>>({}); // ADDED STATE
  const [isProcessingDerivedData, setIsProcessingDerivedData] = useState(true);

  const { data: cachedExercises, loading: loadingExercises, error: exercisesError, refresh: refreshExercises } = useCacheAndRevalidate<LocalExerciseDefinition>({
    cacheTable: 'exercise_definitions_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => client.from('exercise_definitions').select('*').order('name', { ascending: true }), []),
    queryKey: 'all_exercises',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const { data: cachedTPaths, loading: loadingTPaths, error: tPathsError, refresh: refreshTPaths } = useCacheAndRevalidate<LocalTPath>({
    cacheTable: 't_paths_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => client.from('t_paths').select('*'), []),
    queryKey: 'all_t_paths',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const { profile, isLoading: loadingProfile, error: profileError, refresh: refreshProfile } = useUserProfile();
  const cachedProfile = profile ? [profile] : null;

  const { data: cachedTPathExercises, loading: loadingTPathExercises, error: tPathExercisesError, refresh: refreshTPathExercises } = useCacheAndRevalidate<Tables<'t_path_exercises'>>({
    cacheTable: 't_path_exercises_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      const { data, error } = await client.from('t_path_exercises').select('id, exercise_id, template_id, order_index, is_bonus_exercise, created_at');
      return { data: data || [], error };
    }, [session?.user.id]),
    queryKey: 'all_t_path_exercises',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const { data: cachedAchievements, loading: loadingAchievements, error: achievementsError, refresh: refreshAchievements } = useCacheAndRevalidate<LocalUserAchievement>({
    cacheTable: 'user_achievements_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      const { data, error } = await client.from('user_achievements').select('id, user_id, achievement_id, unlocked_at').eq('user_id', session.user.id);
      return { data: data as LocalUserAchievement[] || [], error };
    }, [session?.user.id]),
    queryKey: 'user_achievements',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const { data: cachedUserGyms, loading: loadingUserGyms, error: userGymsError, refresh: refreshUserGyms } = useCacheAndRevalidate<Tables<'gyms'>>({
    cacheTable: 'gyms_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      return client.from('gyms').select('*').eq('user_id', session.user.id);
    }, [session?.user.id]),
    queryKey: 'user_gyms_fetcher',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const [cachedGymExercises, setCachedGymExercises] = useState<LocalGymExercise[] | null>(null);
  const [loadingGymExercises, setLoadingGymExercises] = useState(true);
  const [gymExercisesError, setGymExercisesError] = useState<string | null>(null);

  const fetchGymExercises = useCallback(async () => {
    if (!session?.user.id) {
      setCachedGymExercises([]);
      setLoadingGymExercises(false);
      return;
    }
    setLoadingGymExercises(true);
    setGymExercisesError(null);
    try {
      const { data: userGymsData, error: userGymsError } = await supabase.from('gyms').select('id').eq('user_id', session.user.id);
      if (userGymsError) throw new Error(userGymsError.message || "Failed to fetch user gyms for gym exercises.");
      const gymIds = (userGymsData || []).map(g => g.id);
      if (gymIds.length === 0) {
        setCachedGymExercises([]);
        return;
      }
      const { data, error } = await supabase.from('gym_exercises').select('gym_id, exercise_id, created_at').in('gym_id', gymIds);
      if (error) throw new Error(error.message || "Failed to fetch gym exercises.");
      
      await db.transaction('rw', db.gym_exercises_cache, async () => {
        await db.gym_exercises_cache.clear();
        await db.gym_exercises_cache.bulkPut(data || []);
      });
      setCachedGymExercises(data || []);
    } catch (err: any) {
      console.error("[WorkoutDataFetcher] Error fetching gym exercises:", err);
      setGymExercisesError(err.message || "Failed to load gym exercises.");
      toast.error(`Failed to load gym exercises: ${err.message}`);
    } finally {
      setLoadingGymExercises(false);
    }
  }, [session?.user.id, supabase]);

  useEffect(() => {
    fetchGymExercises();
  }, [fetchGymExercises]);

  const liveCachedGymExercises = useLiveQuery(async () => {
    if (!session?.user.id) return [];
    return db.gym_exercises_cache.toArray();
  }, [session?.user.id]);

  useEffect(() => {
    if (liveCachedGymExercises !== undefined) {
      setCachedGymExercises(liveCachedGymExercises);
    }
  }, [liveCachedGymExercises]);

  const baseLoading = useMemo(() => loadingExercises || loadingTPaths || loadingProfile || loadingTPathExercises || loadingAchievements || loadingUserGyms || loadingGymExercises, [loadingExercises, loadingTPaths, loadingProfile, loadingTPathExercises, loadingAchievements, loadingUserGyms, loadingGymExercises]);
  const dataError = useMemo(() => exercisesError || tPathsError || profileError || tPathExercisesError || achievementsError || userGymsError || gymExercisesError, [exercisesError, tPathsError, profileError, tPathExercisesError, achievementsError, userGymsError, gymExercisesError]);

  const allAvailableExercises = useMemo(() => (cachedExercises || []).map(ex => ({ ...ex, id: ex.id, is_favorited_by_current_user: false, movement_type: ex.movement_type, movement_pattern: ex.movement_pattern })), [cachedExercises]);
  const availableMuscleGroups = useMemo(() => Array.from(new Set((cachedExercises || []).map(ex => ex.main_muscle))).sort(), [cachedExercises]);

  const exerciseGymsMap = useMemo(() => {
    const newExerciseGymsMap: Record<string, string[]> = {};
    const gymIdToNameMap = new Map<string, string>();
    (cachedUserGyms || []).forEach(gym => gymIdToNameMap.set(gym.id, gym.name));

    (cachedGymExercises || []).forEach(link => {
      const gymName = gymIdToNameMap.get(link.gym_id);
      if (gymName) {
        if (!newExerciseGymsMap[link.exercise_id]) {
          newExerciseGymsMap[link.exercise_id] = [];
        }
        newExerciseGymsMap[link.exercise_id].push(gymName);
      }
    });
    return newExerciseGymsMap;
  }, [cachedUserGyms, cachedGymExercises]);

  useEffect(() => {
    const calculateExerciseWorkoutsMap = async () => {
      if (baseLoading || dataError || !session?.user.id || !cachedTPaths || !cachedTPathExercises || !profile) {
        setExerciseWorkoutsMap({});
        return;
      }

      const allTPaths = cachedTPaths || [];
      const tPathExercisesData = cachedTPathExercises || [];
      const activeTPathId = profile.active_t_path_id;
      const preferredSessionLength = profile.preferred_session_length;
      const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);

      let activeChildWorkoutIds: string[] = [];
      let activeWorkoutNames: string[] = [];
      if (activeTPathId) {
        const activeMainTPath = allTPaths.find(tp => tp.id === activeTPathId);
        if (activeMainTPath) {
          const childWorkouts = allTPaths.filter(tp => tp.parent_t_path_id === activeMainTPath.id && tp.is_bonus);
          activeChildWorkoutIds = childWorkouts.map(cw => cw.id);
          activeWorkoutNames = childWorkouts.map(cw => cw.template_name);
        }
      }

      const { data: structureData, error: structureError } = await supabase
        .from('workout_exercise_structure')
        .select('exercise_library_id, workout_name, min_session_minutes, bonus_for_time_group');
      if (structureError) {
        console.error("Error fetching workout structure for map:", structureError);
        toast.error("Failed to load workout structure details.");
        return;
      }

      const libraryIdToUuidMap = new Map<string, string>();
      (cachedExercises || []).forEach(ex => {
        if (ex.library_id) libraryIdToUuidMap.set(ex.library_id, ex.id);
      });

      const newMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]> = {};

      tPathExercisesData.forEach(tpe => {
        if (activeChildWorkoutIds.includes(tpe.template_id)) {
          const workout = allTPaths.find(tp => tp.id === tpe.template_id);
          if (workout) {
            if (!newMap[tpe.exercise_id]) newMap[tpe.exercise_id] = [];
            if (!newMap[tpe.exercise_id].some(item => item.id === workout.id)) {
              newMap[tpe.exercise_id].push({
                id: workout.id,
                name: workout.template_name,
                isUserOwned: workout.user_id === session.user.id,
                isBonus: !!tpe.is_bonus_exercise,
              });
            }
          }
        }
      });

      (structureData || []).forEach(structure => {
        if (activeWorkoutNames.includes(structure.workout_name)) {
          const isIncludedAsMain = structure.min_session_minutes !== null && maxAllowedMinutes >= structure.min_session_minutes;
          const isIncludedAsBonus = structure.bonus_for_time_group !== null && maxAllowedMinutes >= structure.bonus_for_time_group;
          if (isIncludedAsMain || isIncludedAsBonus) {
            const exerciseUuid = libraryIdToUuidMap.get(structure.exercise_library_id);
            if (exerciseUuid) {
              if (!newMap[exerciseUuid]) newMap[exerciseUuid] = [];
              if (!newMap[exerciseUuid].some(item => item.name === structure.workout_name)) {
                newMap[exerciseUuid].push({
                  id: `global_${structure.workout_name}`,
                  name: structure.workout_name,
                  isUserOwned: false,
                  isBonus: false,
                });
              }
            }
          }
        }
      });
      setExerciseWorkoutsMap(newMap);
    };
    calculateExerciseWorkoutsMap();
  }, [baseLoading, dataError, session?.user.id, cachedTPaths, cachedTPathExercises, profile, cachedExercises, supabase]);


  const workoutExercisesCache = useMemo(() => {
    if (baseLoading || dataError || !session?.user.id) return {};
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
    return newWorkoutExercisesCache;
  }, [cachedExercises, cachedTPaths, cachedTPathExercises, session?.user.id, baseLoading, dataError]);

  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);

  useEffect(() => {
    const enrichAndSetGroupedTPaths = async () => {
      if (baseLoading || dataError || !session?.user.id || !cachedTPaths) {
        setGroupedTPaths([]);
        if (!baseLoading) {
          setIsProcessingDerivedData(false);
        }
        return;
      }

      setIsProcessingDerivedData(true);
      const userMainTPaths = (cachedTPaths || []).filter(tp => tp.user_id === session.user.id && !tp.parent_t_path_id);
      const allChildWorkouts = (cachedTPaths || []).filter(tp => tp.user_id === session.user.id && tp.parent_t_path_id);
      try {
        const newGroupedTPaths: GroupedTPath[] = await Promise.all(
          userMainTPaths.map(async (mainTPath) => {
            let childWorkouts = allChildWorkouts.filter(tp => tp.parent_t_path_id === mainTPath.id);
            const enrichedChildWorkouts = await Promise.all(
              childWorkouts.map(async (workout) => {
                try {
                  const { data: lastSessionDate, error: rpcError } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
                  if (rpcError && rpcError.code !== 'PGRST116') throw rpcError;
                  return { ...workout, last_completed_at: lastSessionDate?.[0]?.last_completed_at || null };
                } catch (err) {
                  console.error(`[WorkoutDataFetcher] Error fetching last completed date for workout ${workout.id}:`, err);
                  toast.error(`Failed to load last completion date for workout ${workout.template_name}.`);
                  return { ...workout, last_completed_at: null };
                }
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
      } catch (enrichError: any) {
        console.error("[WorkoutDataFetcher] Failed to enrich workout data:", enrichError);
        toast.error("Could not load workout completion dates.");
      } finally {
        setIsProcessingDerivedData(false);
      }
    };
    enrichAndSetGroupedTPaths();
  }, [session?.user.id, supabase, cachedTPaths, baseLoading, dataError]);

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refreshExercises(),
      refreshTPaths(),
      refreshProfile(),
      refreshTPathExercises(),
      refreshAchievements(),
      refreshUserGyms(),
      fetchGymExercises(),
    ]);
  }, [refreshExercises, refreshTPaths, refreshProfile, refreshTPathExercises, refreshAchievements, refreshUserGyms, fetchGymExercises]);

  const status = profile?.t_path_generation_status;
  useEffect(() => {
    const stopPolling = (finalStatus?: 'completed' | 'failed') => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsGeneratingPlan(false);
      if (finalStatus === 'completed') {
        toast.success("Your new workout plan is ready!");
        refreshAllData();
      } else if (finalStatus === 'failed') {
        toast.error("Workout plan generation failed.", {
          description: profile?.t_path_generation_error || "An unknown error occurred.",
        });
      }
    };
    if (status === 'in_progress') {
      if (!pollingRef.current) {
        setIsGeneratingPlan(true);
        pollingRef.current = setInterval(() => refreshProfile(), 3000);
      }
    } else if (prevStatusRef.current === 'in_progress' && (status === 'completed' || status === 'failed')) {
      stopPolling(status);
    } else if (prevStatusRef.current !== 'completed' && status === 'completed') {
      refreshAllData();
      stopPolling();
    } else {
      stopPolling();
    }
    prevStatusRef.current = status || null;
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [status, refreshProfile, refreshAllData, profile?.t_path_generation_error]);

  return {
    allAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    loadingData: baseLoading || isProcessingDerivedData,
    dataError,
    refreshAllData,
    profile: profile || null,
    refreshProfile,
    refreshAchievements,
    refreshTPaths,
    refreshTPathExercises,
    isGeneratingPlan,
    tempStatusMessage,
    setTempStatusMessage,
    availableMuscleGroups,
    userGyms: cachedUserGyms || [],
    exerciseGymsMap,
    exerciseWorkoutsMap, // ADDED
  };
};