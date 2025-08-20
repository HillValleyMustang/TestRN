"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/components/session-context-provider";
import { Tables } from "@/types/supabase";
import { toast } from "sonner";
import { ExerciseForm } from "@/components/manage-exercises/exercise-form";
import { ExerciseList } from "@/components/manage-exercises/exercise-list";

type ExerciseDefinition = Tables<'exercise_definitions'>;

export default function ManageExercisesPage() {
  const { session, supabase } = useSession();
  const [exercises, setExercises] = useState<ExerciseDefinition[]>([]);
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

      // Deduplicate and prioritize user-owned exercises
      const uniqueExercisesMap = new Map<string, ExerciseDefinition>(); // Key: library_id or exercise.id

      // First, add all user-owned exercises. If a library_id exists, use it as a key.
      // If no library_id (user-created from scratch), use its own ID.
      allData.filter(ex => ex.user_id === session.user.id).forEach(ex => {
        const key = ex.library_id || ex.id;
        uniqueExercisesMap.set(key, ex);
      });

      // Then, iterate through global exercises.
      // Only add a global exercise if a user-owned version (with the same library_id) doesn't already exist.
      allData.filter(ex => ex.user_id === null).forEach(ex => {
        const key = ex.library_id || ex.id; // Global exercises should always have a library_id
        if (!uniqueExercisesMap.has(key)) {
          uniqueExercisesMap.set(key, ex);
        }
      });

      let finalExercises = Array.from(uniqueExercisesMap.values());

      // Extract unique muscle groups for the filter dropdown from the *deduplicated* list
      const uniqueMuscles = Array.from(new Set(finalExercises.map(ex => ex.main_muscle))).sort();
      setAvailableMuscleGroups(['all', ...uniqueMuscles]);

      // Apply the selected filter
      if (selectedMuscleFilter !== 'all') {
        finalExercises = finalExercises.filter(ex => ex.main_muscle === selectedMuscleFilter);
      }

      finalExercises.sort((a, b) => a.name.localeCompare(b.name));

      setExercises(finalExercises || []);
    } catch (err: any) {
      toast.error("Failed to load exercises: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [session, supabase, selectedMuscleFilter]); // Re-run when filter changes

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
    if (!exerciseToDelete || exerciseToDelete.user_id === null) return; // Double check
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
          <ExerciseForm
            editingExercise={editingExercise}
            onCancelEdit={handleCancelEdit}
            onSaveSuccess={handleSaveSuccess}
          />
        </div>
        <div className="lg:col-span-2">
          <ExerciseList
            exercises={exercises}
            loading={loading}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            isDeleteDialogOpen={isDeleteDialogOpen}
            exerciseToDelete={exerciseToDelete}
            setIsDeleteDialogOpen={setIsDeleteDialogOpen}
            confirmDeleteExercise={confirmDeleteExercise}
            selectedMuscleFilter={selectedMuscleFilter}
            setSelectedMuscleFilter={setSelectedMuscleFilter}
            availableMuscleGroups={availableMuscleGroups}
          />
        </div>
      </div>
    </div>
  );
}