"use client";

import { useState, useEffect, useCallback } from "react";
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from "sonner";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase"; // Import FetchedExerciseDefinition
import { getMaxMinutes } from '@/lib/utils';
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise } from '@/lib/db';

// Removed local FetchedExerciseDefinition definition

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

  // Define Supabase query functions for caching hook
  const fetchExercisesSupabase = useCallback(async (client: SupabaseClient) => {
    // Fetch all exercises (user-owned and global)
    return client
      .from('exercise_definitions')
      .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite, icon_url, location_tags')
      .order('name', { ascending: true });
  }, []); // Removed sessionUserId from dependencies as we fetch all and filter client-side

  const fetchTPathsSupabase = useCallback(async (client: SupabaseClient) => {
    return client
      .from('t_paths')
      .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id');
  }, []);

  // Use the caching hook for exercises
  const { data: cachedExercises, loading: loadingExercises, error: exercisesError, refresh: refreshExercises } = useCacheAndRevalidate<LocalExerciseDefinition>({
    cacheTable: 'exercise_definitions_cache',
    supabaseQuery: fetchExercisesSupabase,
    queryKey: 'manage_exercises_all_exercises',
    supabase,
    sessionUserId: sessionUserId, // Still pass sessionUserId for cache key, but query fetches all
  });

  // Use the caching hook for T-Paths
  const { data: cachedTPaths, loading: loadingTPaths, error: tPathsError, refresh: refreshTPaths } = useCacheAndRevalidate<LocalTPath>({
    cacheTable: 't_paths_cache',
    supabaseQuery: fetchTPathsSupabase,
    queryKey: 'manage_exercises_all_t_paths',
    supabase,
    sessionUserId: sessionUserId,
  });

  const fetchPageData = useCallback(async () => {
    if (!sessionUserId || loadingExercises || loadingTPaths) return;

    setLoading(true);
    try {
      if (exercisesError) throw new Error(exercisesError);
      if (tPathsError) throw new Error(tPathsError);

      // 1. Fetch user's profile to get active_t_path_id, session length, AND active_location_tag
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_t_path_id, preferred_session_length, active_location_tag')
        .eq('id', sessionUserId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("ManageExercises: Error fetching profile for active T-Path/session length:", profileError);
        throw profileError;
      }
      const activeTPathId = profileData?.active_t_path_id;
      const preferredSessionLength = profileData?.preferred_session_length;
      const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);
      const activeLocationTag = profileData?.active_location_tag;

      // Set the initial filter to the user's active gym, or 'all' if none is set
      setSelectedLocationTag(activeLocationTag || 'all');

      const { data: userGlobalFavorites, error: favoritesError } = await supabase
        .from('user_global_favorites')
        .select('exercise_id')
        .eq('user_id', sessionUserId);

      if (favoritesError) {
        throw new Error(favoritesError.message);
      }
      const favoritedGlobalExerciseIds = new Set(userGlobalFavorites?.map(fav => fav.exercise_id));

      const allTPaths = cachedTPaths || [];
      
      // 2. Identify active child workouts and their names
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
        .from('t_path_exercises')
        .select('exercise_id, template_id, is_bonus_exercise')
        .in('template_id', allWorkoutIds);

      if (tPathExercisesError) {
        throw new Error(tPathExercisesError.message);
      }

      const { data: structureData, error: structureError } = await supabase
        .from('workout_exercise_structure')
        .select('exercise_library_id, workout_name, min_session_minutes, bonus_for_time_group');

      if (structureError) {
        throw new Error(structureError.message);
      }

      const libraryIdToUuidMap = new Map<string, string>();
      (cachedExercises || []).forEach(ex => {
        if (ex.library_id) {
          libraryIdToUuidMap.set(ex.library_id, ex.id);
        }
      });

      const newExerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]> = {};

      tPathExercisesData.forEach(tpe => {
        if (activeChildWorkoutIds.includes(tpe.template_id)) {
          const workout = allTPaths.find(tp => tp.id === tpe.template_id);
          if (workout) {
            if (!newExerciseWorkoutsMap[tpe.exercise_id]) {
              newExerciseWorkoutsMap[tpe.exercise_id] = [];
            }
            if (!newExerciseWorkoutsMap[tpe.exercise_id].some(item => item.id === workout.id)) {
              newExerciseWorkoutsMap[tpe.exercise_id].push({
                id: workout.id,
                name: workout.template_name,
                isUserOwned: workout.user_id === sessionUserId,
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
              if (!newExerciseWorkoutsMap[exerciseUuid]) {
                newExerciseWorkoutsMap[exerciseUuid] = [];
              }
              if (!newExerciseWorkoutsMap[exerciseUuid].some(item => item.name === structure.workout_name)) {
                newExerciseWorkoutsMap[exerciseUuid].push({
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

      setExerciseWorkoutsMap(newExerciseWorkoutsMap);

      const userOwnedExercisesList: FetchedExerciseDefinition[] = [];
      const globalExercisesList: FetchedExerciseDefinition[] = [];

      (cachedExercises || []).forEach(ex => {
        if (ex.user_id === sessionUserId && ex.library_id === null) {
          userOwnedExercisesList.push({ ...ex, id: ex.id, is_favorite: !!ex.is_favorite });
        } else if (ex.user_id === null) {
          globalExercisesList.push({
            ...ex,
            id: ex.id,
            is_favorited_by_current_user: favoritedGlobalExerciseIds.has(ex.id)
          });
        }
      });

      const allTags = new Set<string>();
      userOwnedExercisesList.forEach(ex => {
        if (ex.location_tags) {
          ex.location_tags.forEach(tag => allTags.add(tag));
        }
      });
      setAvailableLocationTags(Array.from(allTags).sort());

      const allUniqueMuscles = Array.from(new Set((cachedExercises || []).map(ex => ex.main_muscle))).sort();
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
        finalUserExercises = finalUserExercises.filter(ex => 
          ex.location_tags && ex.location_tags.includes(selectedLocationTag)
        );
      }

      finalUserExercises.sort((a, b) => a.name.localeCompare(b.name));
      finalGlobalExercises.sort((a, b) => a.name.localeCompare(b.name));

      setUserExercises(finalUserExercises);
      setGlobalExercises(finalGlobalExercises);

    } catch (err: any) {
      toast.error("Failed to load exercises: " + err.message);
      console.error("ManageExercises: Error in fetchPageData:", err);
    } finally {
      setLoading(false);
    }
  }, [sessionUserId, supabase, selectedMuscleFilter, selectedLocationTag, cachedExercises, cachedTPaths, exercisesError, tPathsError, loadingExercises, loadingTPaths]);

  useEffect(() => {
    if (!loadingExercises && !loadingTPaths) {
      fetchPageData();
    }
  }, [fetchPageData, loadingExercises, loadingTPaths]);

  const handleEditClick = useCallback((exercise: FetchedExerciseDefinition) => {
    setEditingExercise(exercise.user_id === sessionUserId ? exercise : { ...exercise, id: null, user_id: sessionUserId, is_favorite: false, library_id: null });
  }, [sessionUserId]);

  const handleCancelEdit = useCallback(() => {
    setEditingExercise(null);
  }, []);

  const handleSaveSuccess = useCallback(() => {
    setEditingExercise(null);
    refreshExercises();
  }, [refreshExercises]);

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
      refreshExercises();
    } catch (err: any) {
      toast.error("Failed to delete exercise: " + err.message, { id: toastId });
    }
  }, [sessionUserId, supabase, refreshExercises]);

  const handleToggleFavorite = useCallback(async (exercise: FetchedExerciseDefinition) => {
    if (!sessionUserId || !exercise.id) return;
    const isUserOwned = exercise.user_id === sessionUserId;
    const isCurrentlyFavorited = isUserOwned ? exercise.is_favorite : exercise.is_favorited_by_current_user;
    const newFavoriteStatus = !isCurrentlyFavorited;
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
      refreshExercises();
    } catch (err: any) {
      toast.error("Failed to update favourite status: " + err.message, { id: toastId });
    }
  }, [sessionUserId, supabase, refreshExercises]);

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
      refreshTPaths();
    } catch (err: any) {
      toast.error("Failed to remove exercise from workout: " + err.message, { id: toastId });
    }
  }, [sessionUserId, supabase, refreshTPaths]);

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