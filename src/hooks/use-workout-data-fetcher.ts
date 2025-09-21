"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, WorkoutExercise, WorkoutWithLastCompleted, GroupedTPath, LocalUserAchievement, Profile, FetchedExerciseDefinition } from '@/types/supabase';
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { db, LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { useUserProfile } from '@/hooks/data/useUserProfile'; // NEW: Import the dedicated profile hook

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

// Define the workout orders
const ULUL_ORDER = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
const PPL_ORDER = ['Push', 'Pull', 'Legs'];

interface UseWorkoutDataFetcherReturn {
  allAvailableExercises: FetchedExerciseDefinition[];
  setAllAvailableExercises: React.Dispatch<React.SetStateAction<FetchedExerciseDefinition[]>>;
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
}

export const useWorkoutDataFetcher = (): UseWorkoutDataFetcherReturn => {
  const { session, supabase } = useSession();

  const [allAvailableExercises, setAllAvailableExercises] = useState<FetchedExerciseDefinition[]>([]);
  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);
  const [workoutExercisesCache, setWorkoutExercisesCache] = useState<Record<string, WorkoutExercise[]>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // Use the caching hook for exercises
  const { data: cachedExercises, loading: loadingExercises, error: exercisesError, refresh: refreshExercises } = useCacheAndRevalidate<LocalExerciseDefinition>({
    cacheTable: 'exercise_definitions_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      return client
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite, icon_url')
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
        .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id, gym_id');
    }, []),
    queryKey: 'all_t_paths',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  // REFACTORED: Use the dedicated hook for the user profile
  const { profile, isLoading: loadingProfile, error: profileError, refresh: refreshProfile } = useUserProfile();
  const cachedProfile = profile ? [profile] : null; // Adapt to the expected array format for the rest of the hook

  // Use the caching hook for T-Path Exercises
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

  // Use the caching hook for User Achievements
  const { data: cachedAchievements, loading: loadingAchievements, error: achievementsError, refresh: refreshAchievements } = useCacheAndRevalidate<LocalUserAchievement>({
    cacheTable: 'user_achievements_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      const { data, error } = await client
        .from('user_achievements')
        .select('id, user_id, achievement_id, unlocked_at')
        .eq('user_id', session.user.id);
      return { data: data as LocalUserAchievement[] || [], error };
    }, [session?.user.id]),
    queryKey: 'user_achievements',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const refreshAllData = useCallback(async () => {
    console.log("[useWorkoutDataFetcher] refreshAllData triggered.");
    await Promise.all([
      refreshExercises(),
      refreshTPaths(),
      refreshProfile(),
      refreshTPathExercises(),
      refreshAchievements(),
    ]);
    console.log("[useWorkoutDataFetcher] All data refreshes completed.");
  }, [refreshExercises, refreshTPaths, refreshProfile, refreshTPathExercises, refreshAchievements]);

  // Effect to process cached data and then trigger enrichment
  useEffect(() => {
    const processAndEnrichData = async () => {
      const isLoading = loadingExercises || loadingTPaths || loadingProfile || loadingTPathExercises || loadingAchievements;
      const anyError = exercisesError || tPathsError || profileError || tPathExercisesError || achievementsError;

      if (isLoading) {
        setLoadingData(true);
        return;
      }

      if (anyError) {
        setDataError(anyError);
        setLoadingData(false);
        console.error("[useWorkoutDataFetcher] Data fetching error:", anyError);
        toast.error("Failed to load workout data from cache.");
        return;
      }

      if (!session?.user.id || !cachedProfile || cachedProfile.length === 0) {
        setGroupedTPaths([]);
        setWorkoutExercisesCache({});
        setLoadingData(false);
        return;
      }

      setAllAvailableExercises((cachedExercises || []).map(ex => ({
        ...ex,
        id: ex.id,
        is_favorited_by_current_user: false,
      })));
      
      const currentProfile = cachedProfile[0];
      console.log(`[useWorkoutDataFetcher] processAndEnrichData: Current Profile active_gym_id: ${currentProfile.active_gym_id}, active_t_path_id: ${currentProfile.active_t_path_id}`);
      console.log(`[useWorkoutDataFetcher] processAndEnrichData: Cached TPaths count: ${(cachedTPaths || []).length}`);
      console.log(`[useWorkoutDataFetcher] processAndEnrichData: Cached TPathExercises count: ${(cachedTPathExercises || []).length}`);

      const userMainTPaths = (cachedTPaths || []).filter(tp => tp.user_id === session.user.id && !tp.parent_t_path_id);
      console.log(`[useWorkoutDataFetcher] processAndEnrichData: User Main TPaths found: ${userMainTPaths.length}`);
      
      if (userMainTPaths.length === 0) {
        setGroupedTPaths([]);
        setWorkoutExercisesCache({});
        setLoadingData(false);
        return;
      }

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

      try {
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

        const activeTPathGroup = currentProfile.active_t_path_id ? newGroupedTPaths.find(group => group.mainTPath.id === currentProfile.active_t_path_id) : null;
        console.log(`[useWorkoutDataFetcher] processAndEnrichData: Final activeTPathGroup found: ${activeTPathGroup ? activeTPathGroup.mainTPath.template_name : 'null'}`);

      } catch (enrichError: any) {
        console.error("[useWorkoutDataFetcher] Failed to enrich workout data:", enrichError);
        toast.error("Could not load workout completion dates.");
      }

      setLoadingData(false);
      setDataError(null);
    };

    processAndEnrichData();
  }, [
    session, supabase,
    cachedExercises, exercisesError,
    cachedTPaths, tPathsError,
    cachedProfile, profileError,
    cachedTPathExercises, tPathExercisesError,
    cachedAchievements, achievementsError,
    loadingExercises, loadingTPaths, loadingProfile, loadingTPathExercises, loadingAchievements,
  ]);

  useEffect(() => {
    const profileData = cachedProfile?.[0];
    const status = profileData?.t_path_generation_status;

    const stopPolling = (finalStatus?: 'completed' | 'failed') => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsGeneratingPlan(false);
      console.log(`[Polling] Stopped polling. Final status: ${finalStatus}`);
      
      if (finalStatus === 'completed') {
        toast.success("Your new workout plan is ready!");
        console.log("[Polling] Generation completed. Refreshing all workout data.");
        refreshAllData();
      } else if (finalStatus === 'failed') {
        toast.error("Workout plan generation failed.", {
          description: profileData?.t_path_generation_error || "An unknown error occurred.",
        });
        console.error("[Polling] Generation failed:", profileData?.t_path_generation_error);
      }
    };

    if (status === 'in_progress') {
      if (!pollingRef.current) {
        setIsGeneratingPlan(true);
        console.log("[Polling] T-Path generation in progress. Starting to poll profile status.");
        pollingRef.current = setInterval(() => {
          console.log("[Polling] Refreshing profile to check status...");
          refreshProfile();
        }, 3000);
      }
    } else if (prevStatusRef.current === 'in_progress' && (status === 'completed' || status === 'failed')) {
      stopPolling(status);
    } else if (prevStatusRef.current !== 'completed' && status === 'completed') {
      console.log("[Polling] Detected direct transition to 'completed'. Refreshing all workout data.");
      refreshAllData();
      stopPolling();
    } else {
      stopPolling();
    }

    prevStatusRef.current = status || null;

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [cachedProfile, refreshProfile, refreshAllData]);

  return {
    allAvailableExercises,
    setAllAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    loadingData,
    dataError,
    refreshAllData,
    profile: cachedProfile?.[0] || null,
    refreshProfile,
    refreshAchievements,
    refreshTPaths,
    refreshTPathExercises,
    isGeneratingPlan,
  };
};