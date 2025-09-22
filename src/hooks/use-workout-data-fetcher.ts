"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, WorkoutExercise, WorkoutWithLastCompleted, GroupedTPath, LocalUserAchievement, Profile, FetchedExerciseDefinition } from '@/types/supabase';
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { db, LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise, LocalGymExercise } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { useUserProfile } from '@/hooks/data/useUserProfile';
import { useLiveQuery } from 'dexie-react-hooks'; // Import useLiveQuery

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
  tempFavoriteStatusMessage: { message: string; type: 'added' | 'removed' } | null;
  setTempFavoriteStatusMessage: (message: { message: string; type: 'added' | 'removed' } | null) => void;
  // NEW: Add these to the return type
  availableMuscleGroups: string[];
  userGyms: Tables<'gyms'>[];
  exerciseGymsMap: Record<string, string[]>;
}

export const useWorkoutDataFetcher = (): UseWorkoutDataFetcherReturn => {
  const { session, supabase } = useSession();
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const [tempFavoriteStatusMessage, setTempFavoriteStatusMessage] = useState<{ message: string; type: 'added' | 'removed' } | null>(null);

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

  // NEW: Fetch user gyms
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

  // NEW: Manual fetching and caching for gym_exercises due to composite primary key
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

  // Use LiveQuery for gym_exercises_cache
  const liveCachedGymExercises = useLiveQuery(async () => {
    if (!session?.user.id) return [];
    return db.gym_exercises_cache.toArray();
  }, [session?.user.id]);

  useEffect(() => {
    if (liveCachedGymExercises !== undefined) {
      setCachedGymExercises(liveCachedGymExercises);
    }
  }, [liveCachedGymExercises]);


  const loadingData = useMemo(() => loadingExercises || loadingTPaths || loadingProfile || loadingTPathExercises || loadingAchievements || loadingUserGyms || loadingGymExercises, [loadingExercises, loadingTPaths, loadingProfile, loadingTPathExercises, loadingAchievements, loadingUserGyms, loadingGymExercises]);
  const dataError = useMemo(() => exercisesError || tPathsError || profileError || tPathExercisesError || achievementsError || userGymsError || gymExercisesError, [exercisesError, tPathsError, profileError, tPathExercisesError, achievementsError, userGymsError, gymExercisesError]);

  const allAvailableExercises = useMemo(() => (cachedExercises || []).map(ex => ({ ...ex, id: ex.id, is_favorited_by_current_user: false, movement_type: ex.movement_type, movement_pattern: ex.movement_pattern })), [cachedExercises]);

  // NEW: Calculate available muscle groups
  const availableMuscleGroups = useMemo(() => {
    return Array.from(new Set((cachedExercises || []).map(ex => ex.main_muscle))).sort();
  }, [cachedExercises]);

  // NEW: Calculate exerciseGymsMap
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


  const workoutExercisesCache = useMemo(() => {
    console.log("[WorkoutDataFetcher] Recalculating workoutExercisesCache.");
    if (loadingData || dataError || !session?.user.id) return {};
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
    console.log("[WorkoutDataFetcher] New workoutExercisesCache:", newWorkoutExercisesCache);
    return newWorkoutExercisesCache;
  }, [cachedExercises, cachedTPaths, cachedTPathExercises, session?.user.id, loadingData, dataError]);

  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);

  useEffect(() => {
    const enrichAndSetGroupedTPaths = async () => {
      console.log("[WorkoutDataFetcher] enrichAndSetGroupedTPaths triggered.");
      if (loadingData || dataError || !session?.user.id || !cachedTPaths) {
        setGroupedTPaths([]);
        console.log("[WorkoutDataFetcher] Skipping enrichAndSetGroupedTPaths due to loading, error, or missing data.");
        return;
      }
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
                  if (rpcError && rpcError.code !== 'PGRST116') throw rpcError; // Ignore no rows found
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
        console.log("[WorkoutDataFetcher] Grouped T-Paths updated:", newGroupedTPaths);
      } catch (enrichError: any) {
        console.error("[WorkoutDataFetcher] Failed to enrich workout data:", enrichError);
        toast.error("Could not load workout completion dates.");
      }
    };
    enrichAndSetGroupedTPaths();
  }, [session?.user.id, supabase, cachedTPaths, loadingData, dataError]);

  const refreshAllData = useCallback(async () => {
    console.log("[WorkoutDataFetcher] refreshAllData called.");
    await Promise.all([
      refreshExercises(),
      refreshTPaths(),
      refreshProfile(),
      refreshTPathExercises(),
      refreshAchievements(),
      refreshUserGyms(), // NEW: Refresh gyms
      fetchGymExercises(), // NEW: Call manual fetch for gym exercises
    ]);
    console.log("[WorkoutDataFetcher] All data refresh initiated.");
  }, [refreshExercises, refreshTPaths, refreshProfile, refreshTPathExercises, refreshAchievements, refreshUserGyms, fetchGymExercises]);

  useEffect(() => {
    const profileData = profile; // Use the profile from useUserProfile directly
    const status = profileData?.t_path_generation_status;
    console.log(`[WorkoutDataFetcher] Profile generation status changed: ${prevStatusRef.current} -> ${status}`);

    const stopPolling = (finalStatus?: 'completed' | 'failed') => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        console.log("[WorkoutDataFetcher] Polling stopped.");
      }
      setIsGeneratingPlan(false);
      if (finalStatus === 'completed') {
        toast.success("Your new workout plan is ready!");
        console.log("[WorkoutDataFetcher] Plan generation completed, refreshing all data.");
        refreshAllData();
      } else if (finalStatus === 'failed') {
        toast.error("Workout plan generation failed.", {
          description: profileData?.t_path_generation_error || "An unknown error occurred.",
        });
        console.error("[WorkoutDataFetcher] Plan generation failed:", profileData?.t_path_generation_error);
      }
    };
    if (status === 'in_progress') {
      if (!pollingRef.current) {
        setIsGeneratingPlan(true);
        pollingRef.current = setInterval(() => refreshProfile(), 3000);
        console.log("[WorkoutDataFetcher] Polling started for plan generation status.");
      }
    } else if (prevStatusRef.current === 'in_progress' && (status === 'completed' || status === 'failed')) {
      stopPolling(status);
    } else if (prevStatusRef.current !== 'completed' && status === 'completed') {
      console.log("[WorkoutDataFetcher] Status is 'completed' and was not 'in_progress' before. Triggering full refresh.");
      refreshAllData();
      stopPolling();
    } else {
      stopPolling();
    }
    prevStatusRef.current = status || null;
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [profile, refreshProfile, refreshAllData]);

  return {
    allAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    loadingData,
    dataError,
    refreshAllData,
    profile: profile || null,
    refreshProfile,
    refreshAchievements,
    refreshTPaths,
    refreshTPathExercises,
    isGeneratingPlan,
    tempFavoriteStatusMessage,
    setTempFavoriteStatusMessage,
    // NEW: Return these values
    availableMuscleGroups,
    userGyms: cachedUserGyms || [],
    exerciseGymsMap,
  };
};