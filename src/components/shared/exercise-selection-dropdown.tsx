"use client";

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tables, FetchedExerciseDefinition } from "@/types/supabase";

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseSelectionDropdownProps {
  exercises: ExerciseDefinition[]; // Now receives a pre-filtered list
  selectedExerciseId: string;
  setSelectedExerciseId: (id: string) => void;
  placeholder?: string;
}

export const ExerciseSelectionDropdown = ({
  exercises,
  selectedExerciseId,
  setSelectedExerciseId,
  placeholder = "Select exercise to add",
}: ExerciseSelectionDropdownProps) => {
  return (
    <Select onValueChange={setSelectedExerciseId} value={selectedExerciseId}>
      <SelectTrigger className="w-full"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="p-0">
        <ScrollArea className="h-64">
          <div className="p-1">
            {exercises.length === 0 ? (
              <div className="text-center text-muted-foreground py-4 text-sm">No exercises found.</div>
            ) : (
              exercises.map(e => (
                <SelectItem key={e.id} value={e.id as string}>
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