"use client";

import { useState, useEffect, useCallback } from "react";
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from "sonner";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase";
import { getMaxMinutes } from '@/lib/utils';
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise } from '@/lib/db';

type TPath = Tables<'t_paths'>;

interface UseManageExercisesDataProps {
  sessionUserId: string | null;
  supabase: SupabaseClient;
  setTempActionStatusMessage: (message: { message: string; type: 'added' | 'removed' | 'info'; icon?: 'heart' | 'check' } | null) => void;
  userGyms: Tables<'gyms'>[];
  exerciseGymsMap: Record<string, string[]>;
  availableMuscleGroups: string[];
  exerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]>;
}

export const useManageExercisesData = ({ sessionUserId, supabase, setTempActionStatusMessage, userGyms, exerciseGymsMap, availableMuscleGroups, exerciseWorkoutsMap }: UseManageExercisesDataProps) => {
  const [globalExercises, setGlobalExercises] = useState<FetchedExerciseDefinition[]>([]);
  const [userExercises, setUserExercises] = useState<FetchedExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExercise, setEditingExercise] = useState<FetchedExerciseDefinition | null>(null);
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('all');
  const [selectedGymFilter, setSelectedGymFilter] = useState<string>('all');
  const [totalUserExercisesCount, setTotalUserExercisesCount] = useState(0);
  const [totalGlobalExercisesCount, setTotalGlobalExercisesCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState(""); // NEW

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
    sessionUserId: sessionUserId,
  });

  const fetchPageData = useCallback(async () => {
    if (!sessionUserId || loadingExercises) return;

    setLoading(true);
    try {
      if (exercisesError) throw new Error(exercisesError);

      const { data: userGlobalFavorites, error: favoritesError } = await supabase
        .from('user_global_favorites')
        .select('exercise_id')
        .eq('user_id', sessionUserId);

      if (favoritesError) throw new Error(favoritesError.message);
      const favoritedGlobalExerciseIds = new Set(userGlobalFavorites?.map(fav => fav.exercise_id));

      const userOwnedExercisesList: FetchedExerciseDefinition[] = [];
      const globalExercisesList: FetchedExerciseDefinition[] = [];

      (cachedExercises || []).forEach(ex => {
        if (ex.user_id === sessionUserId && ex.library_id === null) {
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
      toast.error("Failed to load exercises.");
    } finally {
      setLoading(false);
    }
  }, [sessionUserId, supabase, selectedMuscleFilter, selectedGymFilter, cachedExercises, exercisesError, loadingExercises, userGyms, exerciseGymsMap, searchTerm]); // Add searchTerm

  useEffect(() => {
    if (!loadingExercises) {
      fetchPageData();
    }
  }, [fetchPageData, loadingExercises]);

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
      toast.error("You can only delete your own custom exercises.");
      return;
    }
    const toastId = toast.loading(`Deleting '${exercise.name}'...`);
    try {
      const { error } = await supabase.from('exercise_definitions').delete().eq('id', exercise.id);
      if (error) throw new Error(error.message);
      toast.success("Exercise deleted successfully!", { id: toastId });
      refreshExercises();
    } catch (err: any) {
      console.error("Failed to delete exercise:", err);
      toast.error("Failed to delete exercise.", { id: toastId });
    }
  }, [sessionUserId, supabase, refreshExercises]);

  const handleToggleFavorite = useCallback(async (exercise: FetchedExerciseDefinition) => {
    if (!sessionUserId) {
      toast.error("You must be logged in to favourite exercises.");
      return;
    }
    const isUserOwned = exercise.user_id === sessionUserId;
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

    setTempActionStatusMessage({ message: newFavoriteStatus ? "Added" : "Removed", type: newFavoriteStatus ? 'added' : 'removed', icon: 'heart' });
    setTimeout(() => setTempActionStatusMessage(null), 3000);

    try {
      if (isUserOwned) {
        const { error } = await supabase.from('exercise_definitions').update({ is_favorite: newFavoriteStatus }).eq('id', exercise.id as string).eq('user_id', sessionUserId);
        if (error) throw error;
      } else {
        if (newFavoriteStatus) {
          const { error } = await supabase.from('user_global_favorites').insert({ user_id: sessionUserId, exercise_id: exercise.id as string });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('user_global_favorites').delete().eq('user_id', sessionUserId).eq('exercise_id', exercise.id as string);
          if (error) throw error;
        }
      }
    } catch (err: any) {
      console.error("Failed to toggle favourite status:", err);
      toast.error("Failed to update favourite status.");
      if (isUserOwned) {
        setUserExercises(prev => prev.map(ex => ex.id === exercise.id ? exercise : ex));
      } else {
        setGlobalExercises(prev => prev.map(ex => ex.id === exercise.id ? exercise : ex));
      }
    }
  }, [sessionUserId, supabase, setTempActionStatusMessage]);

  const handleOptimisticAdd = useCallback((exerciseId: string, workoutId: string, workoutName: string, isBonus: boolean) => {
    refreshExercises(); // Refresh to get latest data
  }, [refreshExercises]);

  const handleAddFailure = useCallback((exerciseId: string, workoutId: string) => {
    refreshExercises(); // Refresh to get latest data
  }, [refreshExercises]);

  const handleRemoveFromWorkout = useCallback(async (workoutId: string, exerciseId: string) => {
    if (!sessionUserId) {
      toast.error("You must be logged in to remove exercises from workouts.");
      return;
    }
    if (!confirm("Are you sure you want to remove this exercise from the workout? This action cannot be undone.")) {
      return;
    }
    const toastId = toast.loading("Removing exercise from workout...");
    try {
      const { error } = await supabase.from('t_path_exercises').delete().eq('template_id', workoutId).eq('exercise_id', exerciseId);
      if (error) throw new Error(error.message);
      toast.success("Exercise removed from workout successfully!", { id: toastId });
      refreshExercises();
    } catch (err: any) {
      console.error("Failed to remove exercise from workout:", err);
      toast.error("Failed to remove exercise from workout.", { id: toastId });
    }
  }, [sessionUserId, supabase, refreshExercises]);

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
    refreshExercises,
    refreshTPaths: () => {}, // Placeholder, not needed here anymore
    totalUserExercisesCount,
    totalGlobalExercisesCount,
    searchTerm, // NEW
    setSearchTerm, // NEW
  };
};