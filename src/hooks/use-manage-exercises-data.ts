"use client";

import { useState, useEffect, useCallback } from "react";
import { SupabaseClient } from '@supabase/supabase-js';
import { toast } from "sonner";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase"; // Import FetchedExerciseDefinition
import { getMaxMinutes } from '@/lib/utils';
import { useCacheAndRevalidate } from './use-cache-and-revalidate';
import { LocalExerciseDefinition, LocalTPath, LocalProfile, LocalTPathExercise } from '@/lib/db';

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
  const [exerciseGymsMap, setExerciseGymsMap] = useState<Record<string, string[]>>({});
  const [userGyms, setUserGyms] = useState<Tables<'gyms'>[]>([]);
  const [selectedGymFilter, setSelectedGymFilter] = useState<string>('all');

  // NEW STATES for total counts
  const [totalUserExercisesCount, setTotalUserExercisesCount] = useState(0);
  const [totalGlobalExercisesCount, setTotalGlobalExercisesCount] = useState(0);

  // Define Supabase query functions for caching hook
  const fetchExercisesSupabase = useCallback(async (client: SupabaseClient) => {
    // Fetch all exercises (user-owned and global)
    return client
      .from('exercise_definitions')
      .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite, icon_url, movement_type, movement_pattern')
      .order('name', { ascending: true });
  }, []); // Removed sessionUserId from dependencies as we fetch all and filter client-side

  const fetchTPathsSupabase = useCallback(async (client: SupabaseClient) => {
    return client
      .from('t_paths')
      .select('id, template_name, is_bonus, version, settings, progression_settings, parent_t_path_id, created_at, user_id, gym_id');
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

      // Fetch gyms and gym_exercises
      const { data: gymsData, error: gymsError } = await supabase
        .from('gyms')
        .select('*')
        .eq('user_id', sessionUserId);
      if (gymsError) throw new Error(gymsError.message);
      setUserGyms(gymsData || []);

      const gymIds = (gymsData || []).map(g => g.id);
      const { data: gymExercisesData, error: gymExercisesError } = await supabase
        .from('gym_exercises')
        .select('exercise_id, gym_id')
        .in('gym_id', gymIds);
      if (gymExercisesError) throw new Error(gymExercisesError.message);

      const gymIdToNameMap = new Map<string, string>();
      (gymsData || []).forEach(gym => gymIdToNameMap.set(gym.id, gym.name));

      const newExerciseGymsMap: Record<string, string[]> = {};
      (gymExercisesData || []).forEach(link => {
        const gymName = gymIdToNameMap.get(link.gym_id);
        if (gymName) {
          if (!newExerciseGymsMap[link.exercise_id]) {
            newExerciseGymsMap[link.exercise_id] = [];
          }
          newExerciseGymsMap[link.exercise_id].push(gymName);
        }
      });
      setExerciseGymsMap(newExerciseGymsMap);

      // 1. Fetch user's profile to get active_t_path_id AND preferred_session_length
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_t_path_id, preferred_session_length') // Added preferred_session_length
        .eq('id', sessionUserId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("ManageExercises: Error fetching profile for active T-Path/session length:", profileError);
        toast.error("Failed to load user profile for workout plan details.");
        throw profileError;
      }
      const activeTPathId = profileData?.active_t_path_id;
      const preferredSessionLength = profileData?.preferred_session_length;
      const maxAllowedMinutes = getMaxMinutes(preferredSessionLength);
      console.log("ManageExercises: Active T-Path ID:", activeTPathId, "Preferred Session Length:", preferredSessionLength, "Max Allowed Minutes:", maxAllowedMinutes);


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
      console.log("ManageExercises: Active Child Workout IDs:", activeChildWorkoutIds);
      console.log("ManageExercises: Active Workout Names (from T-Paths):", activeWorkoutNames);


      const allWorkoutIds = allTPaths.map(tp => tp.id);

      const { data: tPathExercisesData, error: tPathExercisesError } = await supabase
        .from('t_path_exercises')
        .select('exercise_id, template_id, is_bonus_exercise')
        .in('template_id', allWorkoutIds); // Keep fetching all, but filter later

      if (tPathExercisesError) {
        throw new Error(tPathExercisesError.message);
      }

      // NEW: Fetch workout structure for global badge info
      const { data: structureData, error: structureError } = await supabase
        .from('workout_exercise_structure')
        .select('exercise_library_id, workout_name, min_session_minutes, bonus_for_time_group'); // Added session length fields

      if (structureError) {
        throw new Error(structureError.message);
      }
      console.log("ManageExercises: Raw Workout Structure Data:", structureData);


      // Create a map from library_id to the actual exercise UUID
      const libraryIdToUuidMap = new Map<string, string>();
      (cachedExercises || []).forEach(ex => {
        if (ex.library_id) {
          libraryIdToUuidMap.set(ex.library_id, ex.id);
        }
      });
      console.log("ManageExercises: Library ID to UUID Map:", libraryIdToUuidMap);


      const newExerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean; isBonus: boolean }[]> = {};

      // 1. Populate from user's t_path_exercises, BUT ONLY FOR ACTIVE WORKOUTS
      tPathExercisesData.forEach(tpe => {
        if (activeChildWorkoutIds.includes(tpe.template_id)) { // Filter here
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

      // 2. Populate from global workout_exercise_structure, BUT ONLY FOR ACTIVE WORKOUT NAMES AND SESSION LENGTH
      (structureData || []).forEach(structure => {
        // Check if the workout_name from structureData is one of the active workout names
        if (activeWorkoutNames.includes(structure.workout_name)) {
          const isIncludedAsMain = structure.min_session_minutes !== null && maxAllowedMinutes >= structure.min_session_minutes;
          const isIncludedAsBonus = structure.bonus_for_time_group !== null && maxAllowedMinutes >= structure.bonus_for_time_group;

          console.log(`ManageExercises: Processing structure for ${structure.workout_name} - ${structure.exercise_library_id}`);
          console.log(`  isIncludedAsMain: ${isIncludedAsMain} (min_session_minutes: ${structure.min_session_minutes})`);
          console.log(`  isIncludedAsBonus: ${isIncludedAsBonus} (bonus_for_time_group: ${structure.bonus_for_time_group})`);
          console.log(`  maxAllowedMinutes: ${maxAllowedMinutes}`);


          if (isIncludedAsMain || isIncludedAsBonus) { // Only add badge if it would be included in the workout
            const exerciseUuid = libraryIdToUuidMap.get(structure.exercise_library_id);
            console.log(`  Resolved exerciseUuid for ${structure.exercise_library_id}: ${exerciseUuid}`);

            if (exerciseUuid) {
              if (!newExerciseWorkoutsMap[exerciseUuid]) {
                newExerciseWorkoutsMap[exerciseUuid] = [];
              }
              // Ensure we don't add duplicate badges for the same workout name
              if (!newExerciseWorkoutsMap[exerciseUuid].some(item => item.name === structure.workout_name)) {
                newExerciseWorkoutsMap[exerciseUuid].push({
                  id: `global_${structure.workout_name}`, // Unique ID for this badge instance
                  name: structure.workout_name,
                  isUserOwned: false,
                  isBonus: false, // Global structure doesn't define bonus status, assume false
                });
                console.log(`  Added badge for ${structure.workout_name} to exercise ${exerciseUuid}`);
              } else {
                console.log(`  Badge for ${structure.workout_name} already exists for exercise ${exerciseUuid}, skipping.`);
              }
            } else {
              console.warn(`  Could not find UUID for library_id: ${structure.exercise_library_id} in libraryIdToUuidMap.`);
            }
          } else {
            console.log(`  Exercise ${structure.exercise_library_id} for workout ${structure.workout_name} not included due to session length.`);
          }
        } else {
          console.log(`ManageExercises: Skipping structure for ${structure.workout_name} as it's not in activeWorkoutNames.`);
        }
      });

      setExerciseWorkoutsMap(newExerciseWorkoutsMap);
      console.log("ManageExercises: Final Exercise Workouts Map:", newExerciseWorkoutsMap);


      // Separate user-owned and global exercises based on strict criteria
      const userOwnedExercisesList: FetchedExerciseDefinition[] = [];
      const globalExercisesList: FetchedExerciseDefinition[] = [];

      (cachedExercises || []).forEach(ex => {
        // User-owned exercises must have user_id matching session and library_id must be null
        if (ex.user_id === sessionUserId && ex.library_id === null) {
          userOwnedExercisesList.push({ ...ex, id: ex.id, is_favorite: !!ex.is_favorite, movement_type: ex.movement_type, movement_pattern: ex.movement_pattern });
        } else if (ex.user_id === null) { // Global exercises must have user_id === null
          globalExercisesList.push({
            ...ex,
            id: ex.id,
            is_favorited_by_current_user: favoritedGlobalExerciseIds.has(ex.id),
            movement_type: ex.movement_type,
            movement_pattern: ex.movement_pattern,
          });
        }
        // Any other combination (e.g., user_id === sessionUserId && library_id !== null)
        // is considered an "adopted" duplicate and will not be displayed in either list.
      });

      // NEW: Set total counts before applying filters
      setTotalUserExercisesCount(userOwnedExercisesList.length);
      setTotalGlobalExercisesCount(globalExercisesList.length);

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

      // Apply gym filter
      if (selectedGymFilter !== 'all') {
        const exerciseIdsInSelectedGym = new Set(
          (gymExercisesData || [])
            .filter(link => link.gym_id === selectedGymFilter)
            .map(link => link.exercise_id)
        );
        finalUserExercises = finalUserExercises.filter(ex => ex.id && exerciseIdsInSelectedGym.has(ex.id));
        finalGlobalExercises = finalGlobalExercises.filter(ex => ex.id && exerciseIdsInSelectedGym.has(ex.id));
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
  }, [sessionUserId, supabase, selectedMuscleFilter, selectedGymFilter, cachedExercises, cachedTPaths, exercisesError, tPathsError, loadingExercises, loadingTPaths]);

  useEffect(() => {
    if (!loadingExercises && !loadingTPaths) {
      fetchPageData();
    }
  }, [fetchPageData, loadingExercises, loadingTPaths]);

  const handleEditClick = useCallback((exercise: FetchedExerciseDefinition) => {
    // When editing a global exercise, pre-fill the "Add New Exercise" form
    // The user will then create a new custom exercise based on the global one.
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

    const toastId = toast.loading(`Deleting '${exercise.name}'...`);

    try {
      const { error } = await supabase.from('exercise_definitions').delete().eq('id', exercise.id);
      if (error) {
        throw new Error(error.message);
      }
      toast.success("Exercise deleted successfully!", { id: toastId });
      refreshExercises(); // Trigger revalidation after delete
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

    const toastId = toast.loading(newFavoriteStatus ? "Adding to favourites..." : "Removing from favourites...");

    try {
      if (isUserOwned) {
        const { error } = await supabase
          .from('exercise_definitions')
          .update({ is_favorite: newFavoriteStatus })
          .eq('id', exercise.id as string) // Cast to string as id can be null
          .eq('user_id', sessionUserId);

        if (error) throw error;
        toast.success(newFavoriteStatus ? "Added to favourites!" : "Removed from favourites.", { id: toastId });
      } else { // Global exercise
        if (newFavoriteStatus) {
          const { error } = await supabase
            .from('user_global_favorites')
            .insert({ user_id: sessionUserId, exercise_id: exercise.id as string }); // Cast to string
          if (error) throw error;
          toast.success("Added to favourites!", { id: toastId });
        } else {
          const { error } = await supabase
            .from('user_global_favorites')
            .delete()
            .eq('user_id', sessionUserId)
            .eq('exercise_id', exercise.id as string); // Cast to string
          if (error) throw error;
          toast.success("Removed from favourites.", { id: toastId });
        }
      }
      refreshExercises(); // Trigger revalidation after favorite change
    } catch (err: any) {
      console.error("Failed to toggle favourite status:", err);
      toast.error("Failed to update favourite status.", { id: toastId });
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

    const toastId = toast.loading("Removing exercise from workout...");

    try {
      const { error } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('template_id', workoutId)
        .eq('exercise_id', exerciseId);

      if (error) {
        throw new Error(error.message);
      }
      toast.success("Exercise removed from workout successfully!", { id: toastId });
      refreshTPaths(); // Trigger revalidation of T-Paths after removal
    } catch (err: any) {
      console.error("Failed to remove exercise from workout:", err);
      toast.error("Failed to remove exercise from workout.", { id: toastId });
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
    refreshExercises, // Expose refresh functions
    refreshTPaths,
    totalUserExercisesCount, // NEW: Expose total counts
    totalGlobalExercisesCount, // NEW: Expose total counts
  };
};