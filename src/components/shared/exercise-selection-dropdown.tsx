"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase"; // Import FetchedExerciseDefinition
import { useSession } from "@/components/session-context-provider";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseSelectionDropdownProps {
  allAvailableExercises: FetchedExerciseDefinition[]; // Changed to FetchedExerciseDefinition[]
  exercisesInCurrentContext: ExerciseDefinition[]; // Exercises already in the current workout/session
  selectedExerciseId: string;
  setSelectedExerciseId: (id: string) => void;
  exerciseSourceFilter: 'my-exercises' | 'global-library';
  setExerciseSourceFilter: (filter: 'my-exercises' | 'global-library') => void;
  mainMuscleGroups: string[];
  placeholder?: string;
}

export const ExerciseSelectionDropdown = ({
  allAvailableExercises,
  exercisesInCurrentContext,
  selectedExerciseId,
  setSelectedExerciseId,
  exerciseSourceFilter,
  setExerciseSourceFilter,
  mainMuscleGroups,
  placeholder = "Select exercise to add",
}: ExerciseSelectionDropdownProps) => {
  const { session } = useSession();
  const [selectedMuscleFilter, setSelectedMuscleFilter] = React.useState<string>('all');

  React.useEffect(() => {
    // Reset muscle filter when source filter changes
    setSelectedMuscleFilter('all');
  }, [exerciseSourceFilter]);

  const filteredExercises = allAvailableExercises
    .filter(ex => {
      if (exerciseSourceFilter === 'my-exercises') return ex.user_id === session?.user.id;
      if (exerciseSourceFilter === 'global-library') return ex.user_id === null;
      return false; // Should not be reached
    })
    .filter(ex => !exercisesInCurrentContext.some(existingEx => existingEx.id === ex.id))
    .filter(ex => selectedMuscleFilter === 'all' || ex.main_muscle === selectedMuscleFilter);

  return (
    <Select onValueChange={setSelectedExerciseId} value={selectedExerciseId}>
      <SelectTrigger className="w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="p-0">
        <div className="flex border-b p-2">
          <Button
            variant={exerciseSourceFilter === 'my-exercises' ? 'secondary' : 'ghost'}
            onClick={() => setExerciseSourceFilter('my-exercises')}
            className="flex-1 h-8 text-xs"
          >
            My Exercises
          </Button>
          <Button
            variant={exerciseSourceFilter === 'global-library' ? 'secondary' : 'ghost'}
            onClick={() => setExerciseSourceFilter('global-library')}
            className="flex-1 h-8 text-xs"
          >
            Global
          </Button>
        </div>
        <div className="p-2 border-b">
          <Select onValueChange={setSelectedMuscleFilter} value={selectedMuscleFilter}>
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
                <SelectItem key={e.id} value={e.id as string}> {/* Cast e.id to string here */}
                  {e.name}
                </SelectItem>
              ))
            )}
          </div>
        </ScrollArea>
      </SelectContent>
    </Select>
  );
};