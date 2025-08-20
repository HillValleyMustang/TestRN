"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { GlobalExerciseList } from "@/components/manage-exercises/global-exercise-list";
import { UserExerciseList } from "@/components/manage-exercises/user-exercise-list";

// Extend the ExerciseDefinition type to include a temporary flag for global exercises
// This flag will be set during data fetching based on user_global_favorites table
interface FetchedExerciseDefinition extends Tables<'exercise_definitions'> {
  is_favorited_by_current_user?: boolean;
}

type TPath = Tables<'t_paths'>;
type TPathExercise = Tables<'t_path_exercises'>;

export default function ManageExercisesPage() {
  const { session, supabase } = useSession();
  const [globalExercises, setGlobalExercises] = useState<FetchedExerciseDefinition[]>([]);
  const [userExercises, setUserExercises] = useState<FetchedExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExercise, setEditingExercise] = useState<FetchedExerciseDefinition | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<FetchedExerciseDefinition | null>(null);
  const [selectedMuscleFilter, setSelectedMuscleFilter] = useState<string>('all');
  const [availableMuscleGroups, setAvailableMuscleGroups] = useState<string[]>([]);
  const [exerciseWorkoutsMap, setExerciseWorkoutsMap] = useState<Record<string, { id: string; name: string; isUserOwned: boolean }[]>>({});

  const fetchExercises = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Fetch all exercises (user's own and global ones)
      const { data: allExercisesData, error: allExercisesError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at, is_favorite')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order('name', { ascending: true });

      if (allExercisesError) {
        throw new Error(allExercisesError.message);
      }

      // Fetch user's global favorites
      const { data: userGlobalFavorites, error: favoritesError } = await supabase
        .from('user_global_favorites')
        .select('exercise_id')
        .eq('user_id', session.user.id);

      if (favoritesError) {
        throw new Error(favoritesError.message);
      }
      const favoritedGlobalExerciseIds = new Set(userGlobalFavorites?.map(fav => fav.exercise_id));

      // Fetch all user's T-Paths (workouts) and their associated exercises
      const { data: userTPaths, error: userTPathsError } = await supabase
        .from('t_paths')
        .select('id, template_name, user_id')
        .eq('user_id', session.user.id)
        .eq('is_bonus', true) // Only fetch child workouts
        .not('parent_t_path_id', 'is', null); // Ensure it's a child workout

      if (userTPathsError) {
        throw new Error(userTPathsError.message);
      }

      const userWorkoutIds = userTPaths.map(tp => tp.id);

      const { data: tPathExercisesData, error: tPathExercisesError } = await supabase
        .from('t_path_exercises')
        .select('exercise_id, template_id')
        .in('template_id', userWorkoutIds);

      if (tPathExercisesError) {
        throw new Error(tPathExercisesError.message);
      }

      // Build exerciseWorkoutsMap
      const newExerciseWorkoutsMap: Record<string, { id: string; name: string; isUserOwned: boolean }[]> = {};
      tPathExercisesData.forEach(tpe => {
        const workout = userTPaths.find(tp => tp.id === tpe.template_id);
        if (workout) {
          if (!newExerciseWorkoutsMap[tpe.exercise_id]) {
            newExerciseWorkoutsMap[tpe.exercise_id] = [];
          }
          newExerciseWorkoutsMap[tpe.exercise_id].push({
            id: workout.id,
            name: workout.template_name,
            isUserOwned: workout.user_id === session.user.id,
          });
        }
      });
      setExerciseWorkoutsMap(newExerciseWorkoutsMap);

      const userOwnedMap = new Map<string, FetchedExerciseDefinition>(); // Key: library_id or exercise.id
      const globalMap = new Map<string, FetchedExerciseDefinition>(); // Key: library_id

      // Populate user-owned exercises first
      allExercisesData.filter(ex => ex.user_id === session.user.id).forEach(ex => {
        const key = ex.library_id || ex.id; // Use library_id if available, otherwise its own ID
        userOwnedMap.set(key, { ...ex, is_favorite: !!ex.is_favorite }); // Ensure is_favorite is boolean
      });

      // Populate global exercises, ensuring no duplicates with user-owned versions
      allExercisesData.filter(ex => ex.user_id === null).forEach(ex => {
        if (ex.library_id && !userOwnedMap.has(ex.library_id)) {
          // Only add global if no user-owned version (with same library_id) exists
          globalMap.set(ex.id, { // Use actual ID for global map key
            ...ex,
            is_favorited_by_current_user: favoritedGlobalExerciseIds.has(ex.id)
          });
        } else if (!ex.library_id && !userOwnedMap.has(ex.id)) {
          // Fallback for global exercises without library_id (shouldn't happen with current data)
          globalMap.set(ex.id, {
            ...ex,
            is_favorited_by_current_user: favoritedGlobalExerciseIds.has(ex.id)
          });
        }
      });

      let finalUserExercises = Array.from(userOwnedMap.values());
      let finalGlobalExercises = Array.from(globalMap.values());

      // Extract unique muscle groups for the filter dropdown from *all* exercises
      const allUniqueMuscles = Array.from(new Set(allExercisesData.map(ex => ex.main_muscle))).sort();
      setAvailableMuscleGroups(allUniqueMuscles); // Removed 'all' and 'favorites' from here

      // Apply the selected filter to both lists
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
  }, [session, supabase, selectedMuscleFilter]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleEditClick = (exercise: FetchedExerciseDefinition) => {
    setEditingExercise(exercise);
  };

  const handleCancelEdit = () => {
    setEditingExercise(null);
  };

  const handleSaveSuccess = () => {
    setEditingExercise(null);
    fetchExercises();
  };

  const handleDeleteClick = (exercise: FetchedExerciseDefinition) => {
    if (exercise.user_id === null) {
      toast.error("You cannot delete global exercises. You can only delete exercises you have created.");
      return;
    }
    setExerciseToDelete(exercise);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteExercise = async () => {
    if (!exerciseToDelete || exerciseToDelete.user_id === null) return;
    const { error } = await supabase.from('exercise_definitions').delete().eq('id', exerciseToDelete.id);
    if (error) {
      toast.error("Failed to delete exercise: " + error.message);
    } else {
      toast.success("Exercise deleted successfully!");
      fetchExercises();
    }
    setIsDeleteDialogOpen(false);
    setExerciseToDelete(null);
  };

  const handleToggleFavorite = async (exercise: FetchedExerciseDefinition) => {
    if (!session) {
      toast.error("You must be logged in to favourite exercises.");
      return;
    }
    try {
      if (exercise.user_id === session.user.id) {
        // This is a user-owned exercise, toggle its is_favorite flag
        const newFavoriteStatus = !exercise.is_favorite;
        const { error } = await supabase
          .from('exercise_definitions')
          .update({ is_favorite: newFavoriteStatus })
          .eq('id', exercise.id)
          .eq('user_id', session.user.id);

        if (error) throw error;
        toast.success(newFavoriteStatus ? "Added to favourites!" : "Removed from favourites.");
      } else if (exercise.user_id === null) {
        // This is a global exercise, toggle its status in user_global_favorites
        const isCurrentlyFavorited = exercise.is_favorited_by_current_user;
        if (isCurrentlyFavorited) {
          const { error } = await supabase
            .from('user_global_favorites')
            .delete()
            .eq('user_id', session.user.id)
            .eq('exercise_id', exercise.id);
          if (error) throw error;
          toast.success("Removed from favourites.");
        } else {
          const { error } = await supabase
            .from('user_global_favorites')
            .insert({ user_id: session.user.id, exercise_id: exercise.id });
          if (error) throw error;
          toast.success("Added to favourites!");
        }
      }
      fetchExercises(); // Re-fetch to update UI
    } catch (err: any) {
      console.error("Failed to toggle favourite status:", err);
      toast.error("Failed to update favourite status: " + err.message);
    }
  };

  const handleRemoveFromWorkout = async (workoutId: string, exerciseId: string) => {
    if (!session) {
      toast.error("You must be logged in to remove exercises from workouts.");
      return;
    }

    if (!confirm("Are you sure you want to remove this exercise from the workout? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('t_path_exercises')
        .delete()
        .eq('template_id', workoutId)
        .eq('exercise_id', exerciseId);

      if (error) {
        throw error;
      }
      toast.success("Exercise removed from workout successfully!");
      fetchExercises(); // Re-fetch to update UI
    } catch (err: any) {
      console.error("Failed to remove exercise from workout:", err);
      toast.error("Failed to remove exercise from workout: " + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Manage Exercises</h1>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <UserExerciseList
            exercises={userExercises}
            loading={loading}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            isDeleteDialogOpen={isDeleteDialogOpen}
            exerciseToDelete={exerciseToDelete}
            setIsDeleteDialogOpen={setIsDeleteDialogOpen}
            confirmDeleteExercise={confirmDeleteExercise}
            editingExercise={editingExercise}
            onCancelEdit={handleCancelEdit}
            onSaveSuccess={handleSaveSuccess}
            selectedMuscleFilter={selectedMuscleFilter}
            setSelectedMuscleFilter={setSelectedMuscleFilter}
            availableMuscleGroups={availableMuscleGroups}
            exerciseWorkoutsMap={exerciseWorkoutsMap}
            onRemoveFromWorkout={handleRemoveFromWorkout}
            onToggleFavorite={handleToggleFavorite}
          />
        </div>
        <div className="lg:col-span-2 space-y-8">
          <GlobalExerciseList
            exercises={globalExercises}
            loading={loading}
            onEdit={handleEditClick}
            selectedMuscleFilter={selectedMuscleFilter}
            setSelectedMuscleFilter={setSelectedMuscleFilter}
            availableMuscleGroups={availableMuscleGroups}
            exerciseWorkoutsMap={exerciseWorkoutsMap}
            onRemoveFromWorkout={handleRemoveFromWorkout}
            onToggleFavorite={handleToggleFavorite}
            onAddSuccess={fetchExercises} // Pass fetchExercises to refresh after adding to T-Path
          />
        </div>
      </div>
    </div>
  );
}