"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Tables } from "@/types/supabase";
import { WorkoutExerciseWithDetails } from "@/hooks/use-edit-workout-exercises";
import { ExerciseSelectionDropdown } from '@/components/shared/exercise-selection-dropdown';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner'; // Import toast

type ExerciseDefinition = Tables<'exercise_definitions'>;
type Gym = Tables<'gyms'>;

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
  selectedMuscleFilter: string;
  setSelectedMuscleFilter: (filter: string) => void;
  userGyms: Gym[];
  selectedGymFilter: string;
  setSelectedGymFilter: (filter: string) => void;
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
  selectedMuscleFilter,
  setSelectedMuscleFilter,
  userGyms,
  selectedGymFilter,
  setSelectedGymFilter,
}: AddExerciseSectionProps) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="flex sm:col-span-1">
          <Button
            variant={addExerciseFilter === 'my-exercises' ? 'secondary' : 'ghost'}
            onClick={() => setAddExerciseFilter('my-exercises')}
            className="flex-1 h-9 text-xs"
          >
            My Exercises
          </Button>
          <Button
            variant={addExerciseFilter === 'global-library' ? 'secondary' : 'ghost'}
            onClick={() => setAddExerciseFilter('global-library')}
            className="flex-1 h-9 text-xs"
          >
            Global
          </Button>
        </div>
        <Select onValueChange={setSelectedMuscleFilter} value={selectedMuscleFilter}>
          <SelectTrigger className="w-full h-9 text-xs">
            <SelectValue placeholder="Filter by muscle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Muscle Groups</SelectItem>
            {mainMuscleGroups.map(muscle => (
              <SelectItem key={muscle} value={muscle}>
                {muscle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select onValueChange={setSelectedGymFilter} value={selectedGymFilter} disabled={userGyms.length === 0}>
          <SelectTrigger className="w-full h-9 text-xs">
            <SelectValue placeholder="Filter by gym" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Gyms</SelectItem>
            {userGyms.map(gym => (
              <SelectItem key={gym.id} value={gym.id}>
                {gym.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 w-full">
        <ExerciseSelectionDropdown
          exercises={allAvailableExercises}
          selectedExerciseId={selectedExerciseToAdd}
          setSelectedExerciseId={setSelectedExerciseToAdd}
          placeholder="Select exercise to add"
        />
        <Button type="button" onClick={handleSelectAndPromptBonus} disabled={!selectedExerciseToAdd || isSaving}>
          <PlusCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};