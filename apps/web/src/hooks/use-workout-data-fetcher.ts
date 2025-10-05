"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Tables, WorkoutExercise, WorkoutWithLastCompleted, GroupedTPath, LocalUserAchievement, Profile, FetchedExerciseDefinition } from '@/types/supabase';
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { db, LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise, LocalGym, LocalGymExercise, LocalWorkoutSession, LocalActivityLog } from '@/lib/db';
import { useSession } from '@/components/session-context-provider';
import { useUserProfile } from '@/hooks/data/useUserProfile';
import { useLiveQuery } from 'dexie-react-hooks';
import { getMaxMinutes, areSetsEqual } from '@/lib/utils'; // Import getMaxMinutes and areSetsEqual

const ULUL_ORDER = ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'];
const PPL_ORDER = ['Push', 'Pull', 'Legs'];

interface WeeklySummary {
  completed_workouts: { id: string; name: string }[];
  goal_total: number;
  programme_type: 'ulul' | 'ppl';
  completed_activities: any[]; // Keep this flexible for now
}

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
  tempStatusMessage: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null;
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void;
  availableMuscleGroups: string[];
  userGyms: Tables<'gyms'>[];
  exerciseGymsMap: Record<string, string[]>;
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;
  availableGymExerciseIds: Set<string>;
  allGymExerciseIds: Set<string>;
  weeklySummary: WeeklySummary | null;
  loadingWeeklySummary: boolean;
  addActivityToWeeklySummary: (newActivity: Tables<'activity_logs'>) => void;
}

// Helper to get the start of the week (Monday) in UTC
const getStartOfWeekUTC = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  return d;
};

export const useWorkoutDataFetcher = (): UseWorkoutDataFetcherReturn => {
  const { session, supabase, memoizedSessionUserId } = useSession();
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const [tempStatusMessage, setTempStatusMessage] = useState<{ message: string; type: 'added' | 'removed' | 'success' | 'error' } | null>(null);
  const [exerciseWorkoutsMap, setExerciseWorkoutsMap] = useState<Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>>({});
  const [isProcessingDerivedData, setIsProcessingDerivedData] = useState(true);

  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [loadingWeeklySummary, setLoadingWeeklySummary] = useState(true);

  const availableGymExerciseIdsRef = useRef<Set<string>>(new Set());
  const allGymExerciseIdsRef = useRef<Set<string>>(new Set());

  const { data: cachedExercises, loading: loadingExercises, error: exercisesError, refresh: refreshExercises } = useCacheAndRevalidate<LocalExerciseDefinition>({
    cacheTable: 'exercise_definitions_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => client.from('exercise_definitions').select('*').order('name', { ascending: true }), []),
    queryKey: 'all_exercises',
    supabase,
    sessionUserId: memoizedSessionUserId,
  });

  const { data: cachedTPaths, loading: loadingTPaths, error: tPathsError, refresh: refreshTPaths } = useCacheAndRevalidate<LocalTPath>({
    cacheTable: 't_paths_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => client.from('t_paths').select('*'), []),
    queryKey: 'all_t_paths',
    supabase,
    sessionUserId: memoizedSessionUserId,
  });

  const { profile, isLoading: loadingProfile, error: profileError, refresh: refreshProfile } = useUserProfile();
  const cachedProfile = profile ? [profile] : null;

  const { data: cachedTPathExercises, loading: loadingTPathExercises, error: tPathExercisesError, refresh: refreshTPathExercises } = useCacheAndRevalidate<Tables<'t_path_exercises'>>({
    cacheTable: 't_path_exercises_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null };
      const { data, error } = await client.from('t_path_exercises').select('id, exercise_id, template_id, order_index, is_bonus_exercise, created_at');
      return { data: data || [], error };
    }, [memoizedSessionUserId]),
    queryKey: 'all_t_path_exercises',
    supabase,
    sessionUserId: memoizedSessionUserId,
  });

  const { data: cachedAchievements, loading: loadingAchievements, error: achievementsError, refresh: refreshAchievements } = useCacheAndRevalidate<LocalUserAchievement>({
    cacheTable: 'user_achievements_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null };
      const { data, error } = await client.from('user_achievements').select('id, user_id, achievement_id, unlocked_at').eq('user_id', memoizedSessionUserId);
      return { data: data as LocalUserAchievement[] || [], error };
    }, [memoizedSessionUserId]),
    queryKey: 'user_achievements',
    supabase,
    sessionUserId: memoizedSessionUserId,
  });

  const { data: cachedUserGyms, loading: loadingUserGyms, error: userGymsError, refresh: refreshUserGyms } = useCacheAndRevalidate<Tables<'gyms'>>({
    cacheTable: 'gyms_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null };
      return client.from('gyms').select('*').eq('user_id', memoizedSessionUserId);
    }, [memoizedSessionUserId]),
    queryKey: 'user_gyms_fetcher',
    supabase,
    sessionUserId: memoizedSessionUserId,
  });

  const [cachedGymExercises, setCachedGymExercises] = useState<LocalGymExercise[] | null>(null);
  const [loadingGymExercises, setLoadingGymExercises] = useState(true);
  const [gymExercisesError, setGymExercisesError] = useState<string | null>(null);

  const fetchGymExercises = useCallback(async () => {
    if (!memoizedSessionUserId) {
      setCachedGymExercises([]);
      setLoadingGymExercises(false);
      return;
    }
    setLoadingGymExercises(true);
    setGymExercisesError(null);
    try {
      const { data: userGymsData, error: userGymsError } = await supabase.from('gyms').select('id').eq('user_id', memoizedSessionUserId);
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
  }, [memoizedSessionUserId, supabase]);

  useEffect(() => {
    fetchGymExercises();
  }, [fetchGymExercises]);

  const liveCachedGymExercises = useLiveQuery(async () => {
    if (!memoizedSessionUserId) return [];
    return db.gym_exercises_cache.toArray();
  }, [memoizedSessionUserId]);

  useEffect(() => {
    if (liveCachedGymExercises !== undefined) {
      setCachedGymExercises(liveCachedGymExercises);
    }
  }, [liveCachedGymExercises]);

  const { data: cachedSessions, loading: loadingSessions, error: sessionsError, refresh: refreshSessions } = useCacheAndRevalidate<LocalWorkoutSession>({
    cacheTable: 'workout_sessions',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null };
      return client.from('workout_sessions').select('*').eq('user_id', memoizedSessionUserId);
    }, [memoizedSessionUserId]),
    queryKey: 'data_fetcher_sessions',
    supabase,
    sessionUserId: memoizedSessionUserId,
  });

  const { data: cachedActivities, loading: loadingActivities, error: activitiesError, refresh: refreshActivities } = useCacheAndRevalidate<LocalActivityLog>({
    cacheTable: 'activity_logs',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null };
      return client.from('activity_logs').select('*').eq('user_id', memoizedSessionUserId);
    }, [memoizedSessionUserId]),
    queryKey: 'data_fetcher_activities',
    supabase,
    sessionUserId: memoizedSessionUserId,
  });

  const baseLoading = useMemo(() => loadingExercises || loadingTPaths || loadingProfile || loadingTPathExercises || loadingAchievements || loadingUserGyms || loadingGymExercises || loadingSessions || loadingActivities, [loadingExercises, loadingTPaths, loadingProfile, loadingTPathExercises, loadingAchievements, loadingUserGyms, loadingGymExercises, loadingSessions, loadingActivities]);
  const dataError = useMemo(() => exercisesError || tPathsError || profileError || tPathExercisesError || achievementsError || userGymsError || gymExercisesError || sessionsError || activitiesError, [exercisesError, tPathsError, profileError, tPathExercisesError, achievementsError, userGymsError, gymExercisesError, sessionsError, activitiesError]);

  const allAvailableExercises = useMemo(() => (cachedExercises || []).map(ex => ({ ...ex, id: ex.id, is_favorited_by_current_user: false, movement_type: ex.movement_type, movement_pattern: ex.movement_pattern })), [cachedExercises]);
  const availableMuscleGroups = useMemo(() => Array.from(new Set((cachedExercises || []).map(ex => ex.main_muscle))).sort(), [cachedExercises]);

  const userGyms = useMemo(() => cachedUserGyms || [], [cachedUserGyms]);

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

  const derivedAvailableGymExerciseIds = useMemo(() => {
    if (!profile?.active_gym_id || !cachedGymExercises) return new Set<string>();
    return new Set(cachedGymExercises.filter(link => link.gym_id === profile.active_gym_id).map(link => link.exercise_id));
  }, [profile?.active_gym_id, cachedGymExercises]);

  const derivedAllGymExerciseIds = useMemo(() => {
    if (!cachedGymExercises) return new Set<string>();
    return new Set(cachedGymExercises.map(link => link.exercise_id));
  }, [cachedGymExercises]);

  useEffect(() => {
    if (!areSetsEqual(derivedAvailableGymExerciseIds, availableGymExerciseIdsRef.current)) {
      availableGymExerciseIdsRef.current = derivedAvailableGymExerciseIds;
    }
    if (!areSetsEqual(derivedAllGymExerciseIds, allGymExerciseIdsRef.current)) {
      allGymExerciseIdsRef.current = derivedAllGymExerciseIds;
    }
  }, [derivedAvailableGymExerciseIds, derivedAllGymExerciseIds]);

  const [groupedTPaths, setGroupedTPaths] = useState<GroupedTPath[]>([]);

  const workoutExercisesCache = useMemo(() => {
    if (baseLoading || dataError || !memoizedSessionUserId || !cachedTPaths || !cachedTPathExercises || !cachedExercises) {
      return {};
    }
    const exerciseDefMap = new Map<string, LocalExerciseDefinition>();
    (cachedExercises || []).forEach(def => exerciseDefMap.set(def.id, def as LocalExerciseDefinition));

    const newWorkoutExercisesCache: Record<string, WorkoutExercise[]> = {};
    const allChildWorkouts = (cachedTPaths || []).filter(tp => tp.user_id === memoizedSessionUserId && tp.parent_t_path_id);
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
  }, [baseLoading, dataError, memoizedSessionUserId, cachedTPaths, cachedTPathExercises, cachedExercises]);

  useEffect(() => {
    if (baseLoading || dataError || !profile) {
      setLoadingWeeklySummary(baseLoading);
      return;
    }

    setLoadingWeeklySummary(true);
    
    let programmeType = profile?.programme_type;
    if (profile?.active_t_path_id) {
      const activeTPath = (cachedTPaths || []).find(tp => tp.id === profile.active_t_path_id);
      if (activeTPath?.settings && typeof activeTPath.settings === 'object' && 'tPathType' in activeTPath.settings) {
        programmeType = (activeTPath.settings as { tPathType: string }).tPathType;
      }
    }

    if (!programmeType) {
      setWeeklySummary(null);
      setLoadingWeeklySummary(false);
      return;
    }

    const goal_total = programmeType === 'ulul' ? 4 : 3;
    const startOfWeek = getStartOfWeekUTC(new Date());

    const completed_workouts_sorted = (cachedSessions || [])
      .filter(s => s.completed_at && new Date(s.completed_at) >= startOfWeek)
      .sort((a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime())
      .map(s => ({ id: s.id, name: s.template_name || 'Ad Hoc Workout' }));

    const completed_activities = (cachedActivities || [])
      .filter(a => new Date(a.log_date) >= startOfWeek)
      .map(a => ({
        id: a.id,
        type: a.activity_type,
        distance: a.distance,
        time: a.time,
        date: a.log_date,
      }));

    setWeeklySummary({
      completed_workouts: completed_workouts_sorted,
      goal_total,
      programme_type: programmeType as 'ulul' | 'ppl',
      completed_activities,
    });

    setLoadingWeeklySummary(false);

  }, [baseLoading, dataError, profile, cachedSessions, cachedActivities, cachedTPaths]);

  const addActivityToWeeklySummary = useCallback(async (newActivity: Tables<'activity_logs'>) => {
    try {
      await db.activity_logs.put({
        ...newActivity,
        user_id: newActivity.user_id!,
        created_at: newActivity.created_at || new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to add new activity to local cache:", error);
    }
  }, []);

  useEffect(() => {
    const processDerivedData = async () => {
      if (baseLoading || dataError || !memoizedSessionUserId || !cachedTPaths || !cachedTPathExercises || !profile || !cachedExercises) {
        setGroupedTPaths([]);
        setExerciseWorkoutsMap({});
        setIsProcessingDerivedData(false);
        return;
      }

      setIsProcessingDerivedData(true);
      try {
        const allTPaths = cachedTPaths || [];
        const tPathExercisesData = cachedTPathExercises || [];
        const activeTPathId = profile.active_t_path_id;
        const preferredSessionLength = profile.preferred_session_length;
        const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);

        const allChildWorkouts = allTPaths.filter(tp => tp.user_id === memoizedSessionUserId && tp.parent_t_path_id);
        const userMainTPaths = allTPaths.filter(tp => tp.user_id === memoizedSessionUserId && !tp.parent_t_path_id);
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
        if (JSON.stringify(newGroupedTPaths) !== JSON.stringify(groupedTPaths)) {
          setGroupedTPaths(newGroupedTPaths);
        }

        const { data: structureData, error: structureError } = await supabase
          .from('workout_exercise_structure')
          .select('exercise_library_id, workout_name, min_session_minutes, bonus_for_time_group');
        if (structureError) throw structureError;
        const structure = structureData || [];

        const libraryIdToUuidMap = new Map<string, string>();
        (cachedExercises || []).forEach(ex => {
          if (ex.library_id) libraryIdToUuidMap.set(ex.library_id, ex.id);
        });

        const newMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]> = {};
        const activeChildWorkoutIds = activeTPathId ? allTPaths.filter(tp => tp.parent_t_path_id === activeTPathId).map(cw => cw.id) : [];
        const activeWorkoutNames = activeTPathId ? allTPaths.filter(tp => tp.parent_t_path_id === activeTPathId).map(cw => cw.template_name) : [];

        tPathExercisesData.forEach(tpe => {
          if (activeChildWorkoutIds.includes(tpe.template_id)) {
            const workout = allTPaths.find(tp => tp.id === tpe.template_id);
            if (workout) {
              if (!newMap[tpe.exercise_id]) newMap[tpe.exercise_id] = [];
              if (!newMap[tpe.exercise_id].some(item => item.id === workout.id)) {
                newMap[tpe.exercise_id].push({
                  id: workout.id,
                  name: workout.template_name,
                  isUserOwned: workout.user_id === memoizedSessionUserId,
                  isBonus: !!tpe.is_bonus_exercise,
                });
              }
            }
          }
        });

        structure.forEach(s => {
          if (activeWorkoutNames.includes(s.workout_name)) {
            const isIncludedAsMain = s.min_session_minutes !== null && maxAllowedMinutes >= s.min_session_minutes;
            const isIncludedAsBonus = s.bonus_for_time_group !== null && maxAllowedMinutes >= s.bonus_for_time_group;
            if (isIncludedAsMain || isIncludedAsBonus) {
              const exerciseUuid = libraryIdToUuidMap.get(s.exercise_library_id);
              if (exerciseUuid) {
                if (!newMap[exerciseUuid]) newMap[exerciseUuid] = [];
                if (!newMap[exerciseUuid].some(item => item.name === s.workout_name)) {
                  newMap[exerciseUuid].push({
                    id: `global_${s.workout_name}`,
                    name: s.workout_name,
                    isUserOwned: false,
                    isBonus: false,
                  });
                }
              }
            }
          }
        });
        if (JSON.stringify(newMap) !== JSON.stringify(exerciseWorkoutsMap)) {
          setExerciseWorkoutsMap(newMap);
        }
      } catch (enrichError: any) {
        console.error("[WorkoutDataFetcher] Failed to process derived data:", enrichError);
        toast.error("Could not load workout plans.");
      } finally {
        setIsProcessingDerivedData(false);
      }
    };
    processDerivedData();
  }, [
    memoizedSessionUserId, supabase, profile,
    cachedExercises, cachedTPaths, cachedTPathExercises,
    baseLoading, dataError
  ]);

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      refreshExercises(),
      refreshTPaths(),
      refreshProfile(),
      refreshTPathExercises(),
      refreshAchievements(),
      refreshUserGyms(),
      fetchGymExercises(),
      refreshSessions(),
      refreshActivities(),
    ]);
  }, [refreshExercises, refreshTPaths, refreshProfile, refreshTPathExercises, refreshAchievements, refreshUserGyms, fetchGymExercises, refreshSessions, refreshActivities]);

  const status = profile?.t_path_generation_status;
  useEffect(() => {
    const stopPolling = (finalStatus?: 'completed' | 'failed') => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsGeneratingPlan(false);
      if (finalStatus === 'completed') {
        setTempStatusMessage({ message: "Updated!", type: 'success' });
        setTimeout(() => setTempStatusMessage(null), 3000);
        refreshAllData();
      } else if (finalStatus === 'failed') {
        setTempStatusMessage({ message: "Error!", type: 'error' });
        setTimeout(() => setTempStatusMessage(null), 3000);
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

  return useMemo(() => ({
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
    exerciseWorkoutsMap,
    availableGymExerciseIds: availableGymExerciseIdsRef.current,
    allGymExerciseIds: allGymExerciseIdsRef.current,
    weeklySummary,
    loadingWeeklySummary,
    addActivityToWeeklySummary,
  }), [
    allAvailableExercises,
    groupedTPaths,
    workoutExercisesCache,
    baseLoading,
    isProcessingDerivedData,
    dataError,
    refreshAllData,
    profile,
    refreshProfile,
    refreshAchievements,
    refreshTPaths,
    refreshTPathExercises,
    isGeneratingPlan,
    tempStatusMessage,
    setTempStatusMessage,
    availableMuscleGroups,
    cachedUserGyms,
    exerciseGymsMap,
    exerciseWorkoutsMap,
    weeklySummary,
    loadingWeeklySummary,
    addActivityToWeeklySummary,
  ]);
};