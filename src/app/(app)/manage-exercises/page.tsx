"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { GlobalExerciseList } from "@/components/manage-exercises/global-exercise-list";
import { UserExerciseList } from "@/components/manage-exercises/user-exercise-list";

type ExerciseDefinition = Tables<'exercise_definitions'>;
type TPath = Tables<'t_paths'>;
type TPathExercise = Tables<'t_path_exercises'>;

export default function ManageExercisesPage() {
  const { session, supabase } = useSession();
  const [globalExercises, setGlobalExercises] = useState<ExerciseDefinition[]>([]);
  const [userExercises, setUserExercises] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExercise, setEditingExercise] = useState<ExerciseDefinition | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseDefinition | null>(null);
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

      const userOwnedMap = new Map<string, ExerciseDefinition>(); // Key: library_id or exercise.id
      const globalMap = new Map<string, ExerciseDefinition>(); // Key: library_id

      // Populate user-owned exercises first
      allExercisesData.filter(ex => ex.user_id === session.user.id).forEach(ex => {
        const key = ex.library_id || ex.id; // Use library_id if available, otherwise its own ID
        userOwnedMap.set(key, ex);
      });

      // Populate global exercises, ensuring no duplicates with user-owned versions
      allExercisesData.filter(ex => ex.user_id === null).forEach(ex => {
        if (ex.library_id && !userOwnedMap.has(ex.library_id)) {
          // Only add global if no user-owned version (with same library_id) exists
          globalMap.set(ex.library_id, ex);
        } else if (!ex.library_id && !userOwnedMap.has(ex.id)) {
          // Fallback for global exercises without library_id (shouldn't happen with current data)
          globalMap.set(ex.id, ex);
        }
      });

      let finalUserExercises = Array.from(userOwnedMap.values());
      let finalGlobalExercises = Array.from(globalMap.values());

      // Extract unique muscle groups for the filter dropdown from *all* exercises
      const allUniqueMuscles = Array.from(new Set(allExercisesData.map(ex => ex.main_muscle))).sort();
      setAvailableMuscleGroups(['all', 'favorites', ...allUniqueMuscles]);

      // Apply the selected filter to both lists
      if (selectedMuscleFilter === 'favorites') {
        finalUserExercises = finalUserExercises.filter(ex => ex.is_favorite);
        finalGlobalExercises = []; // Global exercises are not favorited directly
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

  const handleEditClick = (exercise: ExerciseDefinition) => {
    setEditingExercise(exercise);
  };

  const handleCancelEdit = () => {
    setEditingExercise(null);
  };

  const handleSaveSuccess = () => {
    setEditingExercise(null);
    fetchExercises();
  };

  const handleDeleteClick = (exercise: ExerciseDefinition) => {
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

  const adoptExercise = async (exerciseToAdopt: ExerciseDefinition): Promise<ExerciseDefinition> => {
    if (exerciseToAdopt.user_id === session?.user.id) {
      return exerciseToAdopt; // Already user-owned
    }

    // Check if user already has an adopted copy of this global exercise
    if (exerciseToAdopt.library_id) {
      const { data: existingAdopted, error: fetchError } = await supabase
        .from('exercise_definitions')
        .select('*')
        .eq('user_id', session!.user.id)
        .eq('library_id', exerciseToAdopt.library_id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw fetchError;
      }
      if (existingAdopted) {
        return existingAdopted; // Return existing adopted copy
      }
    }

    // If not user-owned and no adopted copy exists, create one
    const { data: newAdoptedExercise, error: insertError } = await supabase
      .from('exercise_definitions')
      .insert({
        name: exerciseToAdopt.name,
        main_muscle: exerciseToAdopt.main_muscle,
        type: exerciseToAdopt.type,
        category: exerciseToAdopt.category,
        description: exerciseToAdopt.description,
        pro_tip: exerciseToAdopt.pro_tip,
        video_url: exerciseToAdopt.video_url,
        user_id: session!.user.id,
        library_id: exerciseToAdopt.library_id || null, // Preserve library_id if it exists
        is_favorite: false, // Default to not favorited on adoption
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }
    return newAdoptedExercise;
  };

  const handleToggleFavorite = async (exercise: ExerciseDefinition) => {
    if (!session) {
      toast.error("You must be logged in to favorite exercises.");
      return;
    }
    try {
      const userOwnedExercise = await adoptExercise(exercise);
      const newFavoriteStatus = !userOwnedExercise.is_favorite;

      const { error } = await supabase
        .from('exercise_definitions')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', userOwnedExercise.id)
        .eq('user_id', session.user.id);

      if (error) {
        throw error;
      }
      toast.success(newFavoriteStatus ? "Added to favorites!" : "Removed from favorites.");
      fetchExercises(); // Re-fetch to update UI
    } catch (err: any) {
      console.error("Failed to toggle favorite status:", err);
      toast.error("Failed to update favorite status: " + err.message);
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