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
    const { data, error } = await supabase
      .from('exercise_definitions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('name', { ascending: true });

    if (error) {
      toast.error("Failed to load exercises: " + error.message);
    } else {
      setExercises(data || []);
    }
    setLoading(false);
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
    setExerciseToDelete(exercise);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteExercise = async () => {
    if (!exerciseToDelete) return;
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