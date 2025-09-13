"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Tables } from "@/types/supabase";
import { WorkoutExerciseWithDetails } from "@/hooks/use-edit-workout-exercises";
import { ExerciseSelectionDropdown } from '@/components/shared/exercise-selection-dropdown'; // Updated import path

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface AddExerciseSectionProps {
  allAvailableExercises: ExerciseDefinition[];
  exercisesInWorkout: WorkoutExerciseWithDetails[];
  selectedExerciseToAdd: string;
  setSelectedExerciseToAdd: (id: string) => void;
  addExerciseFilter: 'my-exercises' | 'global-library';
  setAddExerciseFilter: (filter: 'my-exercises' | 'global-library') => void;
  handleSelectAndPromptBonus: () => void;
  isSaving: boolean;
  mainMuscleGroups: string[];
}

export const AddExerciseSection = ({
  allAvailableExercises,
  exercisesInWorkout,
  selectedExerciseToAdd,
  setSelectedExerciseToAdd,
  addExerciseFilter,
  setAddExerciseFilter,
  handleSelectAndPromptBonus,
  isSaving,
  mainMuscleGroups,
}: AddExerciseSectionProps) => {
  return (
    <div className="flex gap-2 w-full">
      <ExerciseSelectionDropdown
        allAvailableExercises={allAvailableExercises}
        exercisesInCurrentContext={exercisesInWorkout}
        selectedExerciseId={selectedExerciseToAdd}
        setSelectedExerciseId={setSelectedExerciseToAdd}
        exerciseSourceFilter={addExerciseFilter}
        setExerciseSourceFilter={setAddExerciseFilter}
        mainMuscleGroups={mainMuscleGroups}
        placeholder="Add exercise"
      />
      <Button type="button" onClick={handleSelectAndPromptBonus} disabled={!selectedExerciseToAdd || isSaving}>
        <PlusCircle className="h-4 w-4" />
      </Button>
    </div>
  );
};