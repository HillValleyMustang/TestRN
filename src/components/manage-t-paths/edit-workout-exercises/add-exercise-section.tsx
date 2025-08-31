"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle } from "lucide-react";
import { Tables } from "@/types/supabase";
import { useSession } from "@/components/session-context-provider";
import { WorkoutExerciseWithDetails } from "@/hooks/use-edit-workout-exercises";

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
  const { session } = useSession();
  const [selectedMuscleFilterForAdd, setSelectedMuscleFilterForAdd] = React.useState<string>('all');

  React.useEffect(() => {
    setSelectedMuscleFilterForAdd('all');
  }, [addExerciseFilter]);

  const filteredExercises = allAvailableExercises
    .filter(ex => {
      if (addExerciseFilter === 'my-exercises') return ex.user_id === session?.user.id;
      if (addExerciseFilter === 'global-library') return ex.user_id === null;
      return false; // Should not be reached as 'all' is removed from filter options
    })
    .filter(ex => !exercisesInWorkout.some(existingEx => existingEx.id === ex.id))
    .filter(ex => selectedMuscleFilterForAdd === 'all' || ex.main_muscle === selectedMuscleFilterForAdd);

  return (
    <div className="flex gap-2 w-full">
      <Select onValueChange={setSelectedExerciseToAdd} value={selectedExerciseToAdd}>
        <SelectTrigger className="w-full"><SelectValue placeholder="Add exercise" /></SelectTrigger>
        <SelectContent className="p-0">
          <div className="flex border-b p-2">
            {/* Removed 'All' button */}
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
          {/* New Select for muscle group filtering */}
          <div className="p-2 border-b">
            <Select onValueChange={setSelectedMuscleFilterForAdd} value={selectedMuscleFilterForAdd}>
              <SelectTrigger className="w-full h-8 text-xs">
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
          </div>
          <ScrollArea className="h-64">
            <div className="p-1">
              {filteredExercises.length === 0 ? (
                <div className="text-center text-muted-foreground py-4 text-sm">No exercises found.</div>
              ) : (
                filteredExercises.map(e => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))
              )}
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