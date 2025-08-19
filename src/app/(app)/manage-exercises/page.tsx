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

  const fetchExercises = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      // Fetch all exercises: user's own and global ones
      const { data, error } = await supabase
        .from('exercise_definitions')
        .select('*')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      // Filter out global exercises if a user-owned copy already exists
      const userOwnedExercises = data.filter(ex => ex.user_id === session.user.id);
      const globalExercises = data.filter(ex => ex.user_id === null);

      const userOwnedLibraryIds = new Set(userOwnedExercises.map(ex => ex.library_id).filter(Boolean));

      const filteredGlobalExercises = globalExercises.filter(ex => 
        ex.library_id === null || !userOwnedLibraryIds.has(ex.library_id)
      );

      // Combine and sort: user-owned first, then filtered global
      const combinedExercises = [...userOwnedExercises, ...filteredGlobalExercises];
      combinedExercises.sort((a, b) => a.name.localeCompare(b.name));

      setExercises(combinedExercises || []);
    } catch (err: any) {
      toast.error("Failed to load exercises: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [session, supabase]);

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
          />
        </div>
      </div>
    </div>
  );
}