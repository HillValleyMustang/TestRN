"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { GlobalExerciseList } from "@/components/manage-exercises/global-exercise-list";
import { UserExerciseList } from "@/components/manage-exercises/user-exercise-list";

type ExerciseDefinition = Tables<'exercise_definitions'>;

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

  const fetchExercises = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Fetch all exercises (user's own and global ones)
      const { data: allData, error: allDataError } = await supabase
        .from('exercise_definitions')
        .select('id, name, main_muscle, type, category, description, pro_tip, video_url, user_id, library_id, created_at')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order('name', { ascending: true });

      if (allDataError) {
        throw new Error(allDataError.message);
      }

      const userOwnedMap = new Map<string, ExerciseDefinition>(); // Key: library_id or exercise.id
      const globalMap = new Map<string, ExerciseDefinition>(); // Key: library_id

      // Populate user-owned exercises first
      allData.filter(ex => ex.user_id === session.user.id).forEach(ex => {
        const key = ex.library_id || ex.id; // Use library_id if available, otherwise its own ID
        userOwnedMap.set(key, ex);
      });

      // Populate global exercises, ensuring no duplicates with user-owned versions
      allData.filter(ex => ex.user_id === null).forEach(ex => {
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
      const allUniqueMuscles = Array.from(new Set(allData.map(ex => ex.main_muscle))).sort();
      setAvailableMuscleGroups(['all', ...allUniqueMuscles]);

      // Apply the selected filter to both lists
      if (selectedMuscleFilter !== 'all') {
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
          />
        </div>
      </div>
    </div>
  );
}