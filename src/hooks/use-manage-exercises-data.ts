"use client";

import { useState, useEffect, useCallback } from "react";
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from "sonner";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase"; // Import FetchedExerciseDefinition
import { getMaxMinutes } from '@/lib/utils';
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { db, LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise } from '@/lib/db';

type ExerciseDefinition = Tables<'exercise_definitions'>;
type TPath = Tables<'t_paths'>;

interface UseManageExercisesDataProps {
  sessionUserId: string | null;
  supabase: SupabaseClient;
}

export const useManageExercisesData = ({ sessionUserId, supabase }: UseManageExercisesDataProps) => {
  const [globalExercises, setGlobalExercises] = useState<FetchedExerciseDefinition[]>([]);
  const [userExercises, setUserExercises] = useState<FetchedExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExercise, setEditingExercise] = useState<FetchedExerciseDefinition | null>(null);
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('all');
  const [availableMuscleGroups, setAvailableMuscleGroups] = useState<string[]>([]);
  const [exerciseWorkoutsMap, setExerciseWorkoutsMap] = useState<Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>>({});
  const [selectedLocationTag, setSelectedLocationTag] = useState<string>('all'); // New state
  const [availableLocationTags, setAvailableLocationTags] = useState<string[]>([]); // New state

  // T-Paths can still use the cache as it's not the source of the issue.
  const fetchTPathsSupabase = useCallback(async (client: SupabaseClient) => {
    return client
      .from('t_paths')
      .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id');
  }, []);

  const { data: cachedTPaths, loading: loadingTPaths, error: tPathsError, refresh: refreshTPaths } = useCacheAndRevalidate<LocalTPath>({
    cacheTable: 't_paths_cache',
    supabaseQuery: fetchTPathsSupabase,
    queryKey: 'manage_exercises_all_t_paths',
    supabase,
    sessionUserId: sessionUserId,
  });

  // Main data fetching function - now fetches exercises directly from Supabase.
  const fetchPageData = useCallback(async () => {
    if (!sessionUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      // 1. Fetch ALL exercises directly from Supabase. No cache.
      const { data: allExercisesData, error: allExercisesError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite, icon_url, location_tags')
        .order('name', { ascending: true });
      if (allExercisesError) throw allExercisesError;

      // The rest of the logic remains the same, but operates on fresh data.
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_t_path_id, preferred_session_length, active_location_tag')
        .eq('id', sessionUserId)
        .single();
      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      
      const activeTPathId = profileData?.active_t_path_id;
      const preferredSessionLength = profileData?.preferred_session_length;
      const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);
      const activeLocationTag = profileData?.active_location_tag;
      setSelectedLocationTag(activeLocationTag || 'all');

      const { data: userGlobalFavorites, error: favoritesError } = await supabase
        .from('user_global_favorites').select('exercise_id').eq('user_id', sessionUserId);
      if (favoritesError) throw favoritesError;
      const favoritedGlobalExerciseIds = new Set(userGlobalFavorites?.map(fav => fav.exercise_id));

      const allTPaths = cachedTPaths || [];
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

      const allWorkoutIds = allTPaths.map(tp => tp.id);
      const { data: tPathExercisesData, error: tPathExercisesError } = await supabase
        .from('t_path_exercises').select('exercise_id, template_id, is_bonus_exercise').in('template_id', allWorkoutIds);
      if (tPathExercisesError) throw tPathExercisesError;

      const { data: structureData, error: structureError } = await supabase
        .from('workout_exercise_structure').select('exercise_library_id, workout_name, min_session_minutes, bonus_for_time_group');
      if (structureError) throw structureError;

      const libraryIdToUuidMap = new Map<string, string>();
      (allExercisesData || []).forEach(ex => { if (ex.library_id) libraryIdToUuidMap.set(ex.library_id, ex.id); });

      const newExerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]> = {};
      tPathExercisesData.forEach(tpe => {
        if (activeChildWorkoutIds.includes(tpe.template_id)) {
          const workout = allTPaths.find(tp => tp.id === tpe.template_id);
          if (workout) {
            if (!newExerciseWorkoutsMap[tpe.exercise_id]) newExerciseWorkoutsMap[tpe.exercise_id] = [];
            if (!newExerciseWorkoutsMap[tpe.exercise_id].some(item => item.id === workout.id)) {
              newExerciseWorkoutsMap[tpe.exercise_id].push({ id: workout.id, name: workout.template_name, isUserOwned: workout.user_id === sessionUserId, isBonus: !!tpe.is_bonus_exercise });
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
              if (!newExerciseWorkoutsMap[exerciseUuid]) newExerciseWorkoutsMap[exerciseUuid] = [];
              if (!newExerciseWorkoutsMap[exerciseUuid].some(item => item.name === structure.workout_name)) {
                newExerciseWorkoutsMap[exerciseUuid].push({ id: `global_${structure.workout_name}`, name: structure.workout_name, isUserOwned: false, isBonus: false });
              }
            }
          }
        }
      });
      setExerciseWorkoutsMap(newExerciseWorkoutsMap);

      const userOwnedExercisesList: FetchedExerciseDefinition[] = [];
      const globalExercisesList: FetchedExerciseDefinition[] = [];
      (allExercisesData || []).forEach(ex => {
        if (ex.user_id === sessionUserId && ex.library_id === null) {
          userOwnedExercisesList.push({ ...ex, id: ex.id, is_favorite: !!ex.is_favorite, type: ex.type as FetchedExerciseDefinition['type'] });
        } else if (ex.user_id === null) {
          globalExercisesList.push({ ...ex, id: ex.id, is_favorited_by_current_user: favoritedGlobalExerciseIds.has(ex.id), type: ex.type as FetchedExerciseDefinition['type'] });
        }
      });

      const allTags = new Set<string>();
      userOwnedExercisesList.forEach(ex => { if (ex.location_tags) ex.location_tags.forEach(tag => allTags.add(tag)); });
      setAvailableLocationTags(Array.from(allTags).sort());

      const allUniqueMuscles = Array.from(new Set((allExercisesData || []).map(ex => ex.main_muscle))).sort();
      setAvailableMuscleGroups(allUniqueMuscles);

      let finalUserExercises = userOwnedExercisesList;
      let finalGlobalExercises = globalExercisesList;
      if (selectedMuscleFilter === 'favorites') {
        finalUserExercises = finalUserExercises.filter(ex => ex.is_favorite);
        finalGlobalExercises = finalGlobalExercises.filter(ex => ex.is_favorited_by_current_user);
      } else if (selectedMuscleFilter !== 'all') {
        finalUserExercises = finalUserExercises.filter(ex => ex.main_muscle === selectedMuscleFilter);
        finalGlobalExercises = finalGlobalExercises.filter(ex => ex.main_muscle === selectedMuscleFilter);
      }
      if (selectedLocationTag !== 'all') {
        finalUserExercises = finalUserExercises.filter(ex => ex.location_tags && ex.location_tags.includes(selectedLocationTag));
      }

      setUserExercises(finalUserExercises);
      setGlobalExercises(finalGlobalExercises);

    } catch (err: any) {
      toast.error("Failed to load exercises: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionUserId, supabase, selectedMuscleFilter, selectedLocationTag, cachedTPaths, tPathsError]);

  useEffect(() => {
    if (!loadingTPaths) {
      fetchPageData();
    }
  }, [fetchPageData, loadingTPaths]);

  const handleEditClick = useCallback((exercise: FetchedExerciseDefinition) => {
    setEditingExercise(exercise.user_id === sessionUserId ? exercise : { ...exercise, id: null, user_id: sessionUserId, is_favorite: false, library_id: null });
  }, [sessionUserId]);

  const handleCancelEdit = useCallback(() => {
    setEditingExercise(null);
  }, []);

  const handleSaveSuccess = useCallback(async (savedExercise?: ExerciseDefinition) => {
    setEditingExercise(null);
    await fetchPageData();
  }, [fetchPageData]);

  const handleDeleteExercise = useCallback(async (exercise: FetchedExerciseDefinition) => {
    if (!sessionUserId || !exercise.id || exercise.user_id !== sessionUserId) {
      toast.error("Invalid operation.");
      return;
    }
    const toastId = toast.loading(`Deleting '${exercise.name}'...`);
    try {
      const { error } = await supabase.from('exercise_definitions').delete().eq('id', exercise.id);
      if (error) throw new Error(error.message);
      toast.success("Exercise deleted successfully!", { id: toastId });
      await fetchPageData();
    } catch (err: any) {
      toast.error("Failed to delete exercise: " + err.message, { id: toastId });
    }
  }, [sessionUserId, supabase, fetchPageData]);

  const handleToggleFavorite = useCallback(async (exercise: FetchedExerciseDefinition) => {
    if (!sessionUserId || !exercise.id) return;
    const isUserOwned = exercise.user_id === sessionUserId;
    const newFavoriteStatus = isUserOwned ? !exercise.is_favorite : !exercise.is_favorited_by_current_user;
    const toastId = toast.loading(newFavoriteStatus ? "Adding to favourites..." : "Removing from favourites...");

    try {
      if (isUserOwned) {
        const { error } = await supabase.from('exercise_definitions').update({ is_favorite: newFavoriteStatus }).eq('id', exercise.id).eq('user_id', sessionUserId);
        if (error) throw error;
      } else {
        if (newFavoriteStatus) {
          const { error } = await supabase.from('user_global_favorites').insert({ user_id: sessionUserId, exercise_id: exercise.id });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('user_global_favorites').delete().eq('user_id', sessionUserId).eq('exercise_id', exercise.id);
          if (error) throw error;
        }
      }
      toast.success(newFavoriteStatus ? "Added to favourites!" : "Removed from favourites.", { id: toastId });
      await fetchPageData();
    } catch (err: any) {
      toast.error("Failed to update favourite status: " + err.message, { id: toastId });
    }
  }, [sessionUserId, supabase, fetchPageData]);

  const handleOptimisticAdd = useCallback((exerciseId: string, workoutId: string, workoutName: string, isBonus: boolean) => {
    setExerciseWorkoutsMap(prev => {
      const newMap = { ...prev };
      if (!newMap[exerciseId]) newMap[exerciseId] = [];
      if (!newMap[exerciseId].some(item => item.id === workoutId)) {
        newMap[exerciseId].push({ id: workoutId, name: workoutName, isUserOwned: true, isBonus });
      }
      return newMap;
    });
  }, []);

  const handleAddFailure = useCallback((exerciseId: string, workoutId: string) => {
    setExerciseWorkoutsMap(prev => {
      const newMap = { ...prev };
      if (newMap[exerciseId]) {
        newMap[exerciseId] = newMap[exerciseId].filter(item => item.id !== workoutId);
        if (newMap[exerciseId].length === 0) delete newMap[exerciseId];
      }
      return newMap;
    });
  }, []);

  const handleRemoveFromWorkout = useCallback(async (workoutId: string, exerciseId: string) => {
    if (!sessionUserId || !confirm("Are you sure you want to remove this exercise from the workout? This action cannot be undone.")) return;
    const toastId = toast.loading("Removing exercise from workout...");
    try {
      const { error } = await supabase.from('t_path_exercises').delete().eq('template_id', workoutId).eq('exercise_id', exerciseId);
      if (error) throw new Error(error.message);
      toast.success("Exercise removed from workout successfully!", { id: toastId });
      await refreshTPaths();
    } catch (err: any) {
      toast.error("Failed to remove exercise from workout: " + err.message, { id: toastId });
    }
  }, [sessionUserId, supabase, refreshTPaths]);

  const refreshExercises = fetchPageData;

  return {
    globalExercises,
    userExercises,
    loading,
    editingExercise,
    setEditingExercise,
    selectedMuscleFilter,
    setSelectedMuscleFilter,
    availableMuscleGroups,
    exerciseWorkoutsMap,
    handleEditClick,
    handleCancelEdit,
    handleSaveSuccess,
    handleDeleteExercise,
    handleToggleFavorite,
    handleOptimisticAdd,
    handleAddFailure,
    handleRemoveFromWorkout,
    refreshExercises,
    refreshTPaths,
    selectedLocationTag,
    setSelectedLocationTag,
    availableLocationTags,
  };
};