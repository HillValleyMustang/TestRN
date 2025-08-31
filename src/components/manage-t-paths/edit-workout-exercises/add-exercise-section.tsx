"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";
import { Tables } from "@/types/supabase";
import { useSession } from "@/components/session-context-provider";
import { WorkoutExerciseWithDetails } from "@/hooks/use-edit-workout-exercises"; // Import the extended type

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface AddExerciseSectionProps {
  allAvailableExercises: ExerciseDefinition[];
  exercisesInWorkout: WorkoutExerciseWithDetails[]; // To filter out already added exercises
  selectedExerciseToAdd: string;
  setSelectedExerciseToAdd: (id: string) => void;
  addExerciseFilter: 'all' | 'my-exercises' | 'global-library';
  setAddExerciseFilter: (filter: 'all' | 'my-exercises' | 'global-library') => void;
  handleSelectAndPromptBonus: () => void;
  isSaving: boolean;
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
}: AddExerciseSectionProps) => {
  const { session } = useSession();

  return (
    <div className="flex gap-2 w-full">
      <Select onValueChange={setSelectedExerciseToAdd} value={selectedExerciseToAdd}>
        <SelectTrigger className="w-full"><SelectValue placeholder="Add exercise" /></SelectTrigger>
        <SelectContent className="p-0">
          <div className="flex border-b p-2">
            <Button
              variant={addExerciseFilter === 'all' ? 'secondary' : 'ghost'}
              onClick={() => setAddExerciseFilter('all')}
              className="flex-1 h-8 text-xs"
            >
              All
            </Button>
            <Button
              variant={addExerciseFilter === 'my-exercises' ? 'secondary' : 'ghost'}
              onClick={() => setAddExerciseFilter('my-exercises')}
              className="flex-1 h-8 text-xs"
            >
              My Exercises
            </Button>
            <Button
              variant={addExerciseFilter === 'global-library' ? 'secondary' : 'ghost'}
              onClick={() => setAddExerciseFilter('global-library')}
              className="flex-1 h-8 text-xs"
            >
              Global
            </Button>
          </div>
          <ScrollArea className="h-64">
            <div className="p-1">
              {allAvailableExercises
                .filter(ex => {
                  if (addExerciseFilter === 'my-exercises') return ex.user_id === session?.user.id;
                  if (addExerciseFilter === 'global-library') return ex.user_id === null;
                  return true; // 'all' filter
                })
                .filter(ex => !exercisesInWorkout.some(existingEx => existingEx.id === ex.id))
                .map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name} ({e.main_muscle})
                  </SelectItem>
                ))}
            </div>
          </ScrollArea>
        </SelectContent>
      </Select>
      <Button type="button" onClick={handleSelectAndPromptBonus} disabled={!selectedExerciseToAdd || isSaving}>
        <PlusCircle className="h-4 w-4" />
      </Button>
    </div>
  );
};