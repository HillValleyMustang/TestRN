"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, WorkoutExercise, WorkoutWithLastCompleted, GroupedTPath, LocalUserAchievement, Profile, FetchedExerciseDefinition } from '@/types/supabase'; // Import centralized types, including Profile and FetchedExerciseDefinition
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { db, LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';

type TPath = Tables<'t_paths'>;
type ExerciseDefinition = Tables<'exercise_definitions'>;

// Define the workout orders
const ULUL_ORDER = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
const PPL_ORDER = ['Push', 'Pull', 'Legs'];

interface UseWorkoutDataFetcherReturn {
  allAvailableExercises: FetchedExerciseDefinition[]; // Changed to FetchedExerciseDefinition[]
  setAllAvailableExercises: React.Dispatch<React.SetStateAction<FetchedExerciseDefinition[]>>; // Changed to FetchedExerciseDefinition[]
  groupedTPaths: GroupedTPath[];
  workoutExercisesCache: Record<string, WorkoutExercise[]>;
  loadingData: boolean;
  dataError: string | null;
  refreshAllData: () => void;
  profile: Profile | null; // Expose the user's profile
  refreshProfile: () => void; // Expose refresh for profile
  refreshAchievements: () => void; // Expose refresh for achievements
  isGeneratingPlan: boolean; // Expose the new state
}

export const useWorkoutDataFetcher = (): UseWorkoutDataFetcherReturn => {
  const { session, supabase } = useSession();

  const [allAvailableExercises, setAllAvailableExercises] = useState<FetchedExerciseDefinition[]>([]); // Changed to FetchedExerciseDefinition[]
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
    sessionUserId: session?.user.id ?? null, // Still pass sessionUserId for cache key, but query fetches all
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

  // NEW: Use the caching hook for User Achievements
  const { data: cachedAchievements, loading: loadingAchievements, error: achievementsError, refresh: refreshAchievements } = useCacheAndRevalidate<LocalUserAchievement>({
    cacheTable: 'user_achievements_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!session?.user.id) return { data: [], error: null };
      const { data, error } = await client
        .from('user_achievements')
        .select('id, user_id, achievement_id, unlocked_at')
        .eq('user_id', session.user.id);
      return { data: data as LocalUserAchievement[] || [], error }; // Explicitly cast data
    }, [session?.user.id]),
    queryKey: 'user_achievements',
    supabase,
    sessionUserId: session?.user.id ?? null,
  });

  const refreshAllData = useCallback(() => {
    console.log("[useWorkoutDataFetcher] refreshAllData triggered.");
    refreshExercises();
    refreshTPaths();
    refreshProfile();
    refreshTPathExercises();
    refreshAchievements(); // Refresh achievements
  }, [refreshExercises, refreshTPaths, refreshProfile, refreshTPathExercises, refreshAchievements]);

  // Effect to process cached data and then trigger enrichment
  useEffect(() => {
    const processAndEnrichData = async () => {
      const isLoading = loadingExercises || loadingTPaths || loadingProfile || loadingTPathExercises || loadingAchievements;
      const anyError = exercisesError || tPathsError || profileError || tPathExercisesError || achievementsError;

      console.log(`[useWorkoutDataFetcher] processAndEnrichData: isLoading=${isLoading}, anyError=${anyError}`);

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
        console.log("[useWorkoutDataFetcher] No user session or profile, skipping data processing.");
        setGroupedTPaths([]); // Ensure groupedTPaths is reset if no profile
        setWorkoutExercisesCache({}); // Ensure cache is reset
        setLoadingData(false); // Not loading, just no user/profile yet
        return;
      }

      // --- Start Data Processing ---
      console.log("[useWorkoutDataFetcher] Starting data processing...");
      // Map LocalExerciseDefinition to FetchedExerciseDefinition
      setAllAvailableExercises((cachedExercises || []).map(ex => ({
        ...ex,
        id: ex.id, // LocalExerciseDefinition.id is string, compatible with FetchedExerciseDefinition.id: string | null
        is_favorited_by_current_user: false, // Default, will be updated later if needed
      })));
      
      const userProfile = cachedProfile[0];
      const activeTPathId = userProfile.active_t_path_id;

      if (!activeTPathId) {
        console.log("[useWorkoutDataFetcher] No active T-Path ID found in profile.");
        setGroupedTPaths([]);
        setWorkoutExercisesCache({});
        setLoadingData(false);
        return;
      }

      const activeMainTPath = (cachedTPaths || []).find(tp => tp.id === activeTPathId);

      if (!activeMainTPath) {
        console.warn("[useWorkoutDataFetcher] Active T-Path ID found in profile, but T-Path itself not found in cache.");
        setGroupedTPaths([]);
        setWorkoutExercisesCache({});
        setLoadingData(false);
        return;
      }

      let childWorkouts = (cachedTPaths || []).filter(tp => tp.parent_t_path_id === activeMainTPath.id && tp.is_bonus);

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
      console.log("[useWorkoutDataFetcher] workoutExercisesCache updated:", newWorkoutExercisesCache);


      // Enrich child workouts with last completed date
      try {
        const enrichedChildWorkouts = await Promise.all(
          childWorkouts.map(async (workout) => {
            const { data: lastSessionDate, error: rpcError } = await supabase.rpc('get_last_workout_date_for_t_path', { p_t_path_id: workout.id });
            if (rpcError) {
              console.error(`[useWorkoutDataFetcher] Error fetching last completed date for workout ${workout.id}:`, rpcError);
            }
            return { ...workout, last_completed_at: lastSessionDate?.[0]?.last_completed_at || null };
          })
        );

        // Apply custom sorting for PPL and ULUL workouts
        const tPathSettings = activeMainTPath.settings as { tPathType?: string };
        if (tPathSettings?.tPathType === 'ppl') {
          enrichedChildWorkouts.sort((a, b) => {
            const indexA = PPL_ORDER.indexOf(a.template_name);
            const indexB = PPL_ORDER.indexOf(b.template_name);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
        } else if (tPathSettings?.tPathType === 'ulul') {
          enrichedChildWorkouts.sort((a, b) => {
            const indexA = ULUL_ORDER.indexOf(a.template_name);
            const indexB = ULUL_ORDER.indexOf(b.template_name);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
          });
        }

        setGroupedTPaths([{
          mainTPath: activeMainTPath,
          childWorkouts: enrichedChildWorkouts,
        }]);
        console.log("[useWorkoutDataFetcher] groupedTPaths updated:", [{ mainTPath: activeMainTPath, childWorkouts: enrichedChildWorkouts }]);
      } catch (enrichError: any) {
        console.error("[useWorkoutDataFetcher] Failed to enrich workout data:", enrichError);
        toast.error("Could not load workout completion dates.");
        // Set data anyway, just without completion dates
        setGroupedTPaths([{
          mainTPath: activeMainTPath,
          childWorkouts: childWorkouts.map(cw => ({ ...cw, last_completed_at: null })),
        }]);
      }

      setLoadingData(false);
      setDataError(null);
      console.log("[useWorkoutDataFetcher] Data processing finished.");
    };

    processAndEnrichData();
  }, [
    session, supabase,
    cachedExercises, loadingExercises, exercisesError,
    cachedTPaths, loadingTPaths, tPathsError,
    cachedProfile, loadingProfile, profileError,
    cachedTPathExercises, loadingTPathExercises, tPathExercisesError,
    cachedAchievements, loadingAchievements, achievementsError // Added achievements dependencies
  ]);

  // New useEffect for polling based on profile status
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
    setAllAvailableExercises, // Expose setter
    groupedTPaths,
    workoutExercisesCache,
    loadingData,
    dataError,
    refreshAllData,
    profile: cachedProfile?.[0] || null, // Expose the first profile from cache
    refreshProfile, // Expose refreshProfile
    refreshAchievements, // Expose refreshAchievements
    isGeneratingPlan,
  };
};