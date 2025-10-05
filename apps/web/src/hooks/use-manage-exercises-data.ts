"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from "sonner";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase";
import { getMaxMinutes, areSetsEqual } from '@/lib/utils'; // Import getMaxMinutes and areSetsEqual
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise, LocalGym, LocalGymExercise } from '@/lib/db'; // Import LocalGym and LocalGymExercise
import { useSession } from '@/components/session-context-provider'; // Import useSession

type TPath = Tables<'t_paths'>;

interface UseManageExercisesDataProps {
  sessionUserId: string | null;
  supabase: SupabaseClient;
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void; // UPDATED TYPE
  // Removed userGyms, exerciseGymsMap, availableMuscleGroups, exerciseWorkoutsMap props
}

interface UseManageExercisesDataReturn {
  globalExercises: FetchedExerciseDefinition[];
  userExercises: FetchedExerciseDefinition[];
  loading: boolean;
  editingExercise: FetchedExerciseDefinition | null;
  setEditingExercise: React.Dispatch<React.SetStateAction<FetchedExerciseDefinition | null>>;
  selectedMuscleFilter: string;
  setSelectedMuscleFilter: React.Dispatch<React.SetStateAction<string>>;
  availableMuscleGroups: string[];
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;
  exerciseGymsMap: Record<string, string[]>;
  userGyms: Tables<'gyms'>[];
  selectedGymFilter: string;
  setSelectedGymFilter: React.Dispatch<React.SetStateAction<string>>;
  handleEditClick: (exercise: FetchedExerciseDefinition) => void;
  handleCancelEdit: () => void;
  handleSaveSuccess: () => void;
  handleDeleteExercise: (exercise: FetchedExerciseDefinition) => Promise<void>;
  handleToggleFavorite: (exercise: FetchedExerciseDefinition) => Promise<void>;
  handleOptimisticAdd: (exerciseId: string, workoutId: string, workoutName: string, isBonus: boolean) => void;
  handleAddFailure: (exerciseId: string, workoutId: string) => void;
  handleRemoveFromWorkout: (workoutId: string, exerciseId: string) => Promise<void>;
  refreshExercises: () => void;
  refreshTPaths: () => void;
  totalUserExercisesCount: number;
  totalGlobalExercisesCount: number;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  allAvailableExercises: FetchedExerciseDefinition[]; // ADDED
  supabase: SupabaseClient; // ADDED
  setTempStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'success' | 'error' } | null) => void; // ADDED
}

export const useManageExercisesData = ({ sessionUserId, supabase, setTempStatusMessage }: UseManageExercisesDataProps): UseManageExercisesDataReturn => {
  const [globalExercises, setGlobalExercises] = useState<FetchedExerciseDefinition[]>([]);
  const [userExercises, setUserExercises] = useState<FetchedExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExercise, setEditingExercise] = useState<FetchedExerciseDefinition | null>(null);
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('all');
  const [selectedGymFilter, setSelectedGymFilter] = useState<string>('all');
  const [totalUserExercisesCount, setTotalUserExercisesCount] = useState(0);
  const [totalGlobalExercisesCount, setTotalGlobalExercisesCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState(""); // NEW

  const { session, memoizedSessionUserId } = useSession(); // Get session object and memoizedSessionUserId

  // NEW: Fetch necessary data internally
  const fetchExercisesSupabase = useCallback(async (client: SupabaseClient) => {
    return client
      .from('exercise_definitions')
      .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite, icon_url, movement_type, movement_pattern')
      .order('name', { ascending: true });
  }, []);

  const { data: cachedExercises, loading: loadingExercises, error: exercisesError, refresh: refreshExercises } = useCacheAndRevalidate<LocalExerciseDefinition>({
    cacheTable: 'exercise_definitions_cache',
    supabaseQuery: fetchExercisesSupabase,
    queryKey: 'manage_exercises_all_exercises',
    supabase,
    sessionUserId: memoizedSessionUserId, // Use memoized ID
  });

  const { data: cachedUserGyms, loading: loadingUserGyms, error: userGymsError, refresh: refreshUserGyms } = useCacheAndRevalidate<LocalGym>({
    cacheTable: 'gyms_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      return client.from('gyms').select('*').eq('user_id', memoizedSessionUserId); // Use memoized ID
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'manage_exercises_user_gyms',
    supabase,
    sessionUserId: memoizedSessionUserId, // Use memoized ID
  });

  const { data: cachedGymExercises, loading: loadingGymExercises, error: gymExercisesError, refresh: refreshGymExercises } = useCacheAndRevalidate<LocalGymExercise>({
    cacheTable: 'gym_exercises_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      const { data: userGymsData, error: userGymsError } = await client.from('gyms').select('id').eq('user_id', memoizedSessionUserId); // Use memoized ID
      if (userGymsError) throw new Error(userGymsError.message || "Failed to fetch user gyms for gym exercises.");
      const gymIds = (userGymsData || []).map(g => g.id);
      if (gymIds.length === 0) return { data: [], error: null };
      return client.from('gym_exercises').select('gym_id, exercise_id, created_at').in('gym_id', gymIds);
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'manage_exercises_gym_exercises',
    supabase,
    sessionUserId: memoizedSessionUserId, // Pass memoized ID
  });

  const { data: cachedTPaths, loading: loadingTPaths, error: tPathsError, refresh: refreshTPaths } = useCacheAndRevalidate<LocalTPath>({
    cacheTable: 't_paths_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => client.from('t_paths').select('*'), []),
    queryKey: 'manage_exercises_all_t_paths',
    supabase,
    sessionUserId: memoizedSessionUserId, // Use memoized ID
  });

  const { data: cachedTPathExercises, loading: loadingTPathExercises, error: tPathExercisesError, refresh: refreshTPathExercises } = useCacheAndRevalidate<Tables<'t_path_exercises'>>({
    cacheTable: 't_path_exercises_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      const { data, error } = await client.from('t_path_exercises').select('id, exercise_id, template_id, order_index, is_bonus_exercise, created_at');
      return { data: data || [], error };
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'manage_exercises_all_t_path_exercises',
    supabase,
    sessionUserId: memoizedSessionUserId, // Use memoized ID
  });

  const { data: cachedProfile, loading: loadingProfile, error: profileError } = useCacheAndRevalidate<LocalProfile>({
    cacheTable: 'profiles_cache',
    supabaseQuery: useCallback(async (client: SupabaseClient) => {
      if (!memoizedSessionUserId) return { data: [], error: null }; // Use memoized ID
      const { data, error } = await client.from('profiles').select('*').eq('id', memoizedSessionUserId); // Use memoized ID
      return { data: data || [], error };
    }, [memoizedSessionUserId]), // Depend on memoized ID
    queryKey: 'manage_exercises_user_profile',
    supabase,
    sessionUserId: memoizedSessionUserId, // Use memoized ID
  });
  const profile = cachedProfile?.[0] || null;


  const baseLoading = useMemo(() => loadingExercises || loadingUserGyms || loadingGymExercises || loadingTPaths || loadingTPathExercises || loadingProfile, [loadingExercises, loadingUserGyms, loadingGymExercises, loadingTPaths, loadingTPathExercises, loadingProfile]);
  const dataError = useMemo(() => exercisesError || userGymsError || gymExercisesError || tPathsError || tPathExercisesError || profileError, [exercisesError, userGymsError, gymExercisesError, tPathsError, tPathExercisesError, profileError]);

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

  // NEW: Memoized derived sets
  const derivedAvailableGymExerciseIds = useMemo(() => {
    if (!profile?.active_gym_id || !cachedGymExercises) return new Set<string>();
    return new Set(cachedGymExercises.filter(link => link.gym_id === profile.active_gym_id).map(link => link.exercise_id));
  }, [profile?.active_gym_id, cachedGymExercises]);

  const derivedAllGymExerciseIds = useMemo(() => {
    if (!cachedGymExercises) return new Set<string>();
    return new Set(cachedGymExercises.map(link => link.exercise_id));
  }, [cachedGymExercises]);

  // Effect to update refs only when the *content* of the derived sets changes
  // This useEffect block was moved from useManageExercisesData to useWorkoutDataFetcher
  // because the refs (availableGymExerciseIdsRef, allGymExerciseIdsRef) are declared in useWorkoutDataFetcher.
  // It is now correctly placed in useWorkoutDataFetcher.

  const [exerciseWorkoutsMapState, setExerciseWorkoutsMapState] = useState<Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>>({});

  // Effect to populate exerciseWorkoutsMap asynchronously
  useEffect(() => {
    const populateExerciseWorkoutsMap = async () => {
      if (!memoizedSessionUserId || !profile || !cachedTPaths || !cachedTPathExercises || !cachedExercises) { // Use memoized ID
        setExerciseWorkoutsMapState({}); // Corrected setter name
        return;
      }

      const allTPaths = cachedTPaths || [];
      const tPathExercisesData = cachedTPathExercises || [];
      const activeTPathId = profile.active_t_path_id;
      const preferredSessionLength = profile.preferred_session_length;
      const getMaxMinutes = (sessionLength: string | null | undefined): number => {
        switch (sessionLength) {
          case '15-30': return 30; case '30-45': return 45;
          case '45-60': return 60; case '60-90': return 90;
          default: return 90;
        }
      };
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
        setTempStatusMessage({ message: "Error!", type: 'error' });
        setTimeout(() => setTempStatusMessage(null), 3000);
        return;
      }
      const structure = structureData || [];

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
                isUserOwned: workout.user_id === memoizedSessionUserId, // Changed to memoizedSessionUserId
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
                  id: `global_${s.workout_name}`, // Use a unique ID for global workouts
                  name: s.workout_name,
                  isUserOwned: false,
                  isBonus: false,
                });
              }
            }
          }
        }
      });
      // Only update state if the map has actually changed to prevent re-renders
      if (JSON.stringify(newMap) !== JSON.stringify(exerciseWorkoutsMapState)) {
        setExerciseWorkoutsMapState(newMap);
      }
    };
    populateExerciseWorkoutsMap();
  }, [memoizedSessionUserId, profile, cachedTPaths, cachedTPathExercises, cachedExercises, supabase, exerciseWorkoutsMapState, setTempStatusMessage]);


  const fetchPageData = useCallback(async () => {
    if (!memoizedSessionUserId || baseLoading) return; // Use memoized ID

    setLoading(true);
    try {
      if (dataError) throw new Error(dataError);

      const { data: userGlobalFavorites, error: favoritesError } = await supabase
        .from('user_global_favorites')
        .select('exercise_id')
        .eq('user_id', memoizedSessionUserId); // Use memoized ID

      if (favoritesError) throw new Error(favoritesError.message);
      const favoritedGlobalExerciseIds = new Set(userGlobalFavorites?.map(fav => fav.exercise_id));

      const userOwnedExercisesList: FetchedExerciseDefinition[] = [];
      const globalExercisesList: FetchedExerciseDefinition[] = [];

      (cachedExercises || []).forEach(ex => {
        if (ex.user_id === memoizedSessionUserId && ex.library_id === null) { // Use memoized ID
          userOwnedExercisesList.push({ ...ex, id: ex.id, is_favorite: !!ex.is_favorite, movement_type: ex.movement_type, movement_pattern: ex.movement_pattern });
        } else if (ex.user_id === null) {
          globalExercisesList.push({
            ...ex,
            id: ex.id,
            is_favorited_by_current_user: favoritedGlobalExerciseIds.has(ex.id),
            movement_type: ex.movement_type,
            movement_pattern: ex.movement_pattern,
          });
        }
      });

      setTotalUserExercisesCount(userOwnedExercisesList.length);
      setTotalGlobalExercisesCount(globalExercisesList.length);

      let finalUserExercises = userOwnedExercisesList;
      let finalGlobalExercises = globalExercisesList;

      if (selectedMuscleFilter === 'favorites') {
        finalUserExercises = finalUserExercises.filter(ex => ex.is_favorite);
        finalGlobalExercises = finalGlobalExercises.filter(ex => ex.is_favorited_by_current_user);
      } else if (selectedMuscleFilter !== 'all') {
        finalUserExercises = finalUserExercises.filter(ex => ex.main_muscle === selectedMuscleFilter);
        finalGlobalExercises = finalGlobalExercises.filter(ex => ex.main_muscle === selectedMuscleFilter);
      }

      if (selectedGymFilter !== 'all') {
        const exerciseIdsInSelectedGym = new Set<string>();
        Object.entries(exerciseGymsMap).forEach(([exerciseId, gymNames]) => {
            const gym = userGyms.find(g => g.id === selectedGymFilter);
            if (gym && gymNames.includes(gym.name)) {
                exerciseIdsInSelectedGym.add(exerciseId);
            }
        });
        finalUserExercises = finalUserExercises.filter(ex => ex.id && exerciseIdsInSelectedGym.has(ex.id));
        finalGlobalExercises = finalGlobalExercises.filter(ex => ex.id && exerciseIdsInSelectedGym.has(ex.id));
      }

      // NEW: Search term filter
      if (searchTerm.trim() !== "") {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        finalUserExercises = finalUserExercises.filter(ex => ex.name.toLowerCase().includes(lowerCaseSearchTerm));
        finalGlobalExercises = finalGlobalExercises.filter(ex => ex.name.toLowerCase().includes(lowerCaseSearchTerm));
      }

      finalUserExercises.sort((a, b) => a.name.localeCompare(b.name));
      finalGlobalExercises.sort((a, b) => a.name.localeCompare(b.name));

      setUserExercises(finalUserExercises);
      setGlobalExercises(finalGlobalExercises);

    } catch (err: any) {
      console.error("ManageExercises: Error in fetchPageData:", err);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  }, [memoizedSessionUserId, supabase, selectedMuscleFilter, selectedGymFilter, cachedExercises, dataError, baseLoading, userGyms, exerciseGymsMap, searchTerm, profile, setTempStatusMessage]); // Depend on memoized ID

  useEffect(() => {
    if (!baseLoading) { // Only fetch page data once base data is loaded
      fetchPageData();
    }
  }, [fetchPageData, baseLoading]);

  const handleEditClick = useCallback((exercise: FetchedExerciseDefinition) => {
    setEditingExercise(exercise.user_id === memoizedSessionUserId ? exercise : { ...exercise, id: null, user_id: memoizedSessionUserId, is_favorite: false, library_id: null }); // Use memoized ID
  }, [memoizedSessionUserId]);

  const handleCancelEdit = useCallback(() => {
    setEditingExercise(null);
  }, []);

  const handleSaveSuccess = useCallback(() => {
    setEditingExercise(null);
    refreshExercises();
    refreshUserGyms();
    refreshGymExercises();
    refreshTPaths();
    refreshTPathExercises();
  }, [refreshExercises, refreshUserGyms, refreshGymExercises, refreshTPaths, refreshTPathExercises]);

  const handleDeleteExercise = useCallback(async (exercise: FetchedExerciseDefinition) => {
    if (!memoizedSessionUserId || !exercise.id || exercise.user_id !== memoizedSessionUserId) { // Use memoized ID
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }
    
    try {
      const { error } = await supabase.from('exercise_definitions').delete().eq('id', exercise.id).eq('user_id', memoizedSessionUserId); // Use memoized ID
      if (error) throw new Error(error.message);
      setTempStatusMessage({ message: "Removed!", type: 'removed' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      handleSaveSuccess(); // Refresh all related data
    } catch (err: any) {
      console.error("Failed to delete exercise:", err);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
    }
  }, [memoizedSessionUserId, supabase, handleSaveSuccess, setTempStatusMessage]); // Depend on memoized ID

  const handleToggleFavorite = useCallback(async (exercise: FetchedExerciseDefinition) => {
    if (!memoizedSessionUserId) { // Use memoized ID
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }
    const isUserOwned = exercise.user_id === memoizedSessionUserId; // Use memoized ID
    const isCurrentlyFavorited = isUserOwned ? exercise.is_favorite : exercise.is_favorited_by_current_user;
    const newFavoriteStatus = !isCurrentlyFavorited;

    const updatedExercise = {
      ...exercise,
      is_favorite: isUserOwned ? newFavoriteStatus : exercise.is_favorite,
      is_favorited_by_current_user: !isUserOwned ? newFavoriteStatus : exercise.is_favorited_by_current_user,
    };

    if (isUserOwned) {
      setUserExercises(prev => prev.map(ex => ex.id === exercise.id ? updatedExercise : ex));
    } else {
      setGlobalExercises(prev => prev.map(ex => ex.id === exercise.id ? updatedExercise : ex));
    }

    setTempStatusMessage({ message: newFavoriteStatus ? "Added!" : "Removed!", type: newFavoriteStatus ? 'added' : 'removed' });
    setTimeout(() => setTempStatusMessage(null), 3000);

    try {
      if (isUserOwned) {
        const { error } = await supabase.from('exercise_definitions').update({ is_favorite: newFavoriteStatus }).eq('id', exercise.id as string).eq('user_id', memoizedSessionUserId); // Use memoized ID
        if (error) throw error;
      } else {
        if (newFavoriteStatus) {
          const { error } = await supabase.from('user_global_favorites').insert({ user_id: memoizedSessionUserId, exercise_id: exercise.id as string });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('user_global_favorites').delete().eq('user_id', memoizedSessionUserId).eq('exercise_id', exercise.id as string);
          if (error) throw error;
        }
      }
    } catch (err: any) {
      console.error("Failed to toggle favourite status:", err);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      if (isUserOwned) {
        setUserExercises(prev => prev.map(ex => ex.id === exercise.id ? exercise : ex));
      } else {
        setGlobalExercises(prev => prev.map(ex => ex.id === exercise.id ? exercise : ex));
      }
    }
  }, [memoizedSessionUserId, supabase, setTempStatusMessage]); // Depend on memoized ID

  const handleOptimisticAdd = useCallback((exerciseId: string, workoutId: string, workoutName: string, isBonus: boolean) => {
    handleSaveSuccess(); // Refresh to get latest data
  }, [handleSaveSuccess]);

  const handleAddFailure = useCallback((exerciseId: string, workoutId: string) => {
    handleSaveSuccess(); // Refresh to get latest data
  }, [handleSaveSuccess]);

  const handleRemoveFromWorkout = useCallback(async (workoutId: string, exerciseId: string) => {
    if (!memoizedSessionUserId) { // Use memoized ID
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      return;
    }
    if (!confirm("Are you sure you want to remove this exercise from the workout? This action cannot be undone.")) {
      return;
    }
    
    try {
      const { error } = await supabase.from('t_path_exercises').delete().eq('template_id', workoutId).eq('exercise_id', exerciseId);
      if (error) throw new Error(error.message);
      setTempStatusMessage({ message: "Removed!", type: 'removed' });
      setTimeout(() => setTempStatusMessage(null), 3000);
      handleSaveSuccess(); // Refresh all related data
    } catch (err: any) {
      console.error("Failed to remove exercise from workout:", err);
      setTempStatusMessage({ message: "Error!", type: 'error' });
      setTimeout(() => setTempStatusMessage(null), 3000);
    }
  }, [memoizedSessionUserId, supabase, handleSaveSuccess, setTempStatusMessage]); // Depend on memoized ID

  return {
    globalExercises,
    userExercises,
    loading: baseLoading || loading,
    editingExercise,
    setEditingExercise,
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    availableMuscleGroups,
    exerciseWorkoutsMap: exerciseWorkoutsMapState, // Use the state for the map
    exerciseGymsMap,
    userGyms,
    selectedGymFilter,
    setSelectedGymFilter,
    handleEditClick,
    handleCancelEdit,
    handleSaveSuccess,
    handleDeleteExercise,
    handleToggleFavorite,
    handleOptimisticAdd,
    handleAddFailure,
    handleRemoveFromWorkout,
    refreshExercises: handleSaveSuccess, // Use handleSaveSuccess to trigger full refresh
    refreshTPaths: handleSaveSuccess, // Use handleSaveSuccess to trigger full refresh
    totalUserExercisesCount,
    totalGlobalExercisesCount,
    searchTerm, // NEW
    setSearchTerm, // NEW
    allAvailableExercises, // ADDED
    supabase, // ADDED
    setTempStatusMessage, // ADDED
  };
};