"use client";

import { useState, useEffect, useCallback } from "react";
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from "sonner";
import { Tables } from "@/types/supabase";
import { getMaxMinutes } from '@/lib/utils';
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { LocalExerciseDefinition, LocalTPath } from '@/lib/db';

// Extend the ExerciseDefinition type to include a temporary flag for global exercises
interface FetchedExerciseDefinition extends Tables<'exercise_definitions'> {
  is_favorited_by_current_user?: boolean;
}

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

  // Define Supabase query functions for caching hook
  const fetchExercisesSupabase = useCallback(async (client: SupabaseClient) => {
    // Fetch all exercises (user-owned and global)
    return client
      .from('exercise_definitions')
      .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite, icon_url')
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

      const { data: userGlobalFavorites, error: favoritesError } = await supabase
        .from('user_global_favorites')
        .select('exercise_id')
        .eq('user_id', sessionUserId);

      if (favoritesError) {
        throw new Error(favoritesError.message);
      }
      const favoritedGlobalExerciseIds = new Set(userGlobalFavorites?.map(fav => fav.exercise_id));

      // Fetch all T-Paths (global templates and user-created ones)
      const allTPaths = cachedTPaths || [];
      const allWorkoutIds = allTPaths.map(tp => tp.id);

      // Fetch t_path_exercises for all relevant workouts
      const { data: tPathExercisesData, error: tPathExercisesError } = await supabase
        .from('t_path_exercises')
        .select('exercise_id, template_id, is_bonus_exercise')
        .in('template_id', allWorkoutIds);

      if (tPathExercisesError) {
        throw new Error(tPathExercisesError.message);
      }

      const newExerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]> = {};
      tPathExercisesData.forEach(tpe => {
        const workout = allTPaths.find(tp => tp.id === tpe.template_id);
        if (workout) {
          if (!newExerciseWorkoutsMap[tpe.exercise_id]) {
            newExerciseWorkoutsMap[tpe.exercise_id] = [];
          }
          // Prevent duplicate entries for the same exercise-workout pair
          if (!newExerciseWorkoutsMap[tpe.exercise_id].some(item => item.id === workout.id)) {
            newExerciseWorkoutsMap[tpe.exercise_id].push({
              id: workout.id,
              name: workout.template_name,
              isUserOwned: workout.user_id === sessionUserId,
              isBonus: !!tpe.is_bonus_exercise,
            });
          }
        }
      });
      setExerciseWorkoutsMap(newExerciseWorkoutsMap);

      // Separate user-owned and global exercises based on strict criteria
      const userOwnedExercisesList: FetchedExerciseDefinition[] = [];
      const globalExercisesList: FetchedExerciseDefinition[] = [];

      (cachedExercises || []).forEach(ex => {
        // User-owned exercises must have user_id matching session and library_id must be null
        if (ex.user_id === sessionUserId && ex.library_id === null) {
          userOwnedExercisesList.push({ ...ex, is_favorite: !!ex.is_favorite });
        } else if (ex.user_id === null) { // Global exercises must have user_id === null
          globalExercisesList.push({
            ...ex,
            is_favorited_by_current_user: favoritedGlobalExerciseIds.has(ex.id)
          });
        }
        // Any other combination (e.g., user_id === sessionUserId && library_id !== null)
        // is considered an "adopted" duplicate and will not be displayed in either list.
      });

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

      finalUserExercises.sort((a, b) => a.name.localeCompare(b.name));
      finalGlobalExercises.sort((a, b) => a.name.localeCompare(b.name));

      setUserExercises(finalUserExercises);
      setGlobalExercises(finalGlobalExercises);

    } catch (err: any) {
      toast.error("Failed to load exercises: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionUserId, supabase, selectedMuscleFilter, cachedExercises, cachedTPaths, exercisesError, tPathsError, loadingExercises, loadingTPaths]);

  useEffect(() => {
    if (!loadingExercises && !loadingTPaths) {
      fetchPageData();
    }
  }, [fetchPageData, loadingExercises, loadingTPaths]);

  const handleEditClick = useCallback((exercise: FetchedExerciseDefinition) => {
    // When editing a global exercise, pre-fill the "Add New Exercise" form
    // The user will then create a new custom exercise based on the global one.
    setEditingExercise(exercise.user_id === sessionUserId ? exercise : { ...exercise, id: '', user_id: sessionUserId, is_favorite: false, library_id: null });
  }, [sessionUserId]);

  const handleCancelEdit = useCallback(() => {
    setEditingExercise(null);
  }, []);

  const handleSaveSuccess = useCallback(() => {
    setEditingExercise(null);
    refreshExercises();
  }, [refreshExercises]);

  const handleDeleteExercise = useCallback(async (exercise: FetchedExerciseDefinition) => {
    if (!sessionUserId) {
      toast.error("You must be logged in to delete exercises.");
      return;
    }
    if (!exercise.id) {
      toast.error("Cannot delete an exercise without an ID.");
      return;
    }
    if (exercise.user_id !== sessionUserId) {
      toast.error("You can only delete your own custom exercises.");
      return;
    }

    // Optimistic UI update
    const previousUserExercises = userExercises; // Store current state for rollback
    setUserExercises(prev => prev.filter(ex => ex.id !== exercise.id));
    toast.info(`Deleting '${exercise.name}'...`);

    try {
      const { error } = await supabase.from('exercise_definitions').delete().eq('id', exercise.id);
      if (error) {
        throw new Error(error.message);
      }
      toast.success("Exercise deleted successfully!");
      refreshExercises(); // Trigger revalidation after delete
    } catch (err: any) {
      console.error("Failed to delete exercise:", err);
      toast.error("Failed to delete exercise: " + err.message);
      // Rollback UI on error
      setUserExercises(previousUserExercises); // Revert to previous state
    }
  }, [sessionUserId, supabase, userExercises, refreshExercises]);

  const handleToggleFavorite = useCallback(async (exercise: FetchedExerciseDefinition) => {
    if (!sessionUserId) {
      toast.error("You must be logged in to favourite exercises.");
      return;
    }

    const isUserOwned = exercise.user_id === sessionUserId;
    const isCurrentlyFavorited = isUserOwned ? exercise.is_favorite : exercise.is_favorited_by_current_user;
    const newFavoriteStatus = !isCurrentlyFavorited;

    // Optimistic UI update
    if (isUserOwned) {
      setUserExercises(prev => prev.map(ex => 
        ex.id === exercise.id ? { ...ex, is_favorite: newFavoriteStatus } as FetchedExerciseDefinition : ex
      ));
    } else { // Global exercise
      setGlobalExercises(prev => prev.map(ex => 
        ex.id === exercise.id ? { ...ex, is_favorited_by_current_user: newFavoriteStatus } as FetchedExerciseDefinition : ex
      ));
    }
    toast.info(newFavoriteStatus ? "Adding to favourites..." : "Removing from favourites...");

    try {
      if (isUserOwned) {
        const { error } = await supabase
          .from('exercise_definitions')
          .update({ is_favorite: newFavoriteStatus })
          .eq('id', exercise.id)
          .eq('user_id', sessionUserId);

        if (error) throw error;
        toast.success(newFavoriteStatus ? "Added to favourites!" : "Removed from favourites.");
      } else { // Global exercise
        if (newFavoriteStatus) {
          const { error } = await supabase
            .from('user_global_favorites')
            .insert({ user_id: sessionUserId, exercise_id: exercise.id });
          if (error) throw error;
          toast.success("Added to favourites!");
        } else {
          const { error } = await supabase
            .from('user_global_favorites')
            .delete()
            .eq('user_id', sessionUserId)
            .eq('exercise_id', exercise.id);
          if (error) throw error;
          toast.success("Removed from favourites.");
        }
      }
      refreshExercises(); // Trigger revalidation after favorite change
    } catch (err: any) {
      console.error("Failed to toggle favourite status:", err);
      toast.error("Failed to update favourite status: " + err.message);
      // Rollback UI on error
      if (isUserOwned) {
        setUserExercises(prev => prev.map(ex => 
          ex.id === exercise.id ? { ...ex, is_favorite: isCurrentlyFavorited } as FetchedExerciseDefinition : ex
        ));
      } else {
        setGlobalExercises(prev => prev.map(ex => 
          ex.id === exercise.id ? { ...ex, is_favorited_by_current_user: isCurrentlyFavorited } as FetchedExerciseDefinition : ex
        ));
      }
    }
  }, [sessionUserId, supabase, refreshExercises]);

  const handleOptimisticAdd = useCallback((exerciseId: string, workoutId: string, workoutName: string, isBonus: boolean) => {
    setExerciseWorkoutsMap(prev => {
        const newMap = { ...prev };
        if (!newMap[exerciseId]) {
            newMap[exerciseId] = [];
        }
        // Check if already exists to prevent duplicate optimistic adds
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
              if (newMap[exerciseId].length === 0) {
                  delete newMap[exerciseId];
              }
          }
          return newMap;
      });
  }, []);

  const handleRemoveFromWorkout = useCallback(async (workoutId: string, exerciseId: string) => {
    if (!sessionUserId) {
      toast.error("You must be logged in to remove exercises from workouts.");
      return;
    }

    if (!confirm("Are you sure you want to remove this exercise from the workout? This action cannot be undone.")) {
      return;
    }

    // Optimistic UI update
    const previousExerciseWorkoutsMap = exerciseWorkoutsMap; // Store current state for rollback
    setExerciseWorkoutsMap(prev => {
      const newMap = { ...prev };
      if (newMap[exerciseId]) {
        newMap[exerciseId] = newMap[exerciseId].filter(item => item.id !== workoutId);
        if (newMap[exerciseId].length === 0) {
          delete newMap[exerciseId];
        }
      }
      return newMap;
    });
    toast.info("Removing exercise from workout...");

    try {
      const { error } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('template_id', workoutId)
        .eq('exercise_id', exerciseId);

      if (error) {
        throw new Error(error.message);
      }
      toast.success("Exercise removed from workout successfully!");
      refreshTPaths(); // Trigger revalidation of T-Paths after removal
    } catch (err: any) {
      console.error("Failed to remove exercise from workout:", err);
      toast.error("Failed to remove exercise from workout: " + err.message);
      // Rollback UI on error
      setExerciseWorkoutsMap(previousExerciseWorkoutsMap); // Revert to previous state
    }
  }, [sessionUserId, supabase, exerciseWorkoutsMap, refreshTPaths]);

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
    refreshExercises, // Expose refresh functions
    refreshTPaths,
  };
};