"use client";

import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Tables } from '@/types/supabase';

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseTransferUIProps {
  availableExercises: ExerciseDefinition[];
  exercisesInGym: ExerciseDefinition[];
  onAdd: (exerciseId: string) => void;
  onRemove: (exerciseId: string) => void;
}

const ExerciseListItem = ({ exercise, onAction, actionIcon }: { exercise: ExerciseDefinition; onAction: (id: string) => void; actionIcon: React.ReactNode }) => (
  <li className="flex items-center justify-between p-2 text-sm hover:bg-accent rounded-md">
    <span className="flex-1 truncate pr-2">{exercise.name}</span>
    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => onAction(exercise.id)}>
      {actionIcon}
    </Button>
  </li>
);

export const ExerciseTransferUI = ({
  availableExercises,
  exercisesInGym,
  onAdd,
  onRemove,
}: ExerciseTransferUIProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
      {/* Available Exercises Column */}
      <div className="flex flex-col border rounded-md">
        <h4 className="font-semibold p-3 border-b text-center">Available Exercises</h4>
        <ScrollArea className="flex-grow p-2">
          {availableExercises.length > 0 ? (
            <ul className="space-y-1">
              {availableExercises.map(ex => (
                <ExerciseListItem key={ex.id} exercise={ex} onAction={onAdd} actionIcon={<ChevronRight className="h-4 w-4" />} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center p-4 text-sm">No exercises match filters.</p>
          )}
        </ScrollArea>
      </div>

      {/* Exercises in Gym Column */}
      <div className="flex flex-col border rounded-md">
        <h4 className="font-semibold p-3 border-b text-center">Exercises in this Gym</h4>
        <ScrollArea className="flex-grow p-2">
          {exercisesInGym.length > 0 ? (
            <ul className="space-y-1">
              {exercisesInGym.map(ex => (
                <ExerciseListItem key={ex.id} exercise={ex} onAction={onRemove} actionIcon={<ChevronLeft className="h-4 w-4" />} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center p-4 text-sm">Add exercises from the left.</p>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};