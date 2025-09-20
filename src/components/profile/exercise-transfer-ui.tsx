"use client";

import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react"; // Added Sparkles icon
import { Tables } from '@/types/supabase';
import { WorkoutExerciseWithDetails } from './gym-exercise-manager'; // Import the new type

type ExerciseDefinition = Tables<'exercise_definitions'>;

interface ExerciseTransferUIProps {
  availableExercises: ExerciseDefinition[];
  exercisesInGym: WorkoutExerciseWithDetails[]; // Changed type to WorkoutExerciseWithDetails[]
  onAdd: (exerciseId: string) => void;
  onRemove: (exerciseId: string) => void;
}

const ExerciseListItem = ({ exercise, onAction, actionIcon, isBonus }: { exercise: ExerciseDefinition | WorkoutExerciseWithDetails; onAction: (id: string) => void; actionIcon: React.ReactNode; isBonus?: boolean }) => (
  <li className="flex items-center justify-between p-2 text-sm hover:bg-accent rounded-md">
    <span className="flex-1 truncate pr-2 flex items-center gap-2">
      {exercise.name}
      {isBonus && <Sparkles className="h-3 w-3 text-yellow-500" title="Bonus Exercise" />}
    </span>
    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => onAction(exercise.id)}>
      {actionIcon}
    </Button>
  </li>
);

export const ExerciseTransferUI = ({
  availableExercises,
  exercisesInGym, // Renamed prop to reflect content
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

      {/* Exercises in Selected Workout Column */}
      <div className="flex flex-col border rounded-md">
        <h4 className="font-semibold p-3 border-b text-center">Exercises in Selected Workout</h4>
        <ScrollArea className="flex-grow p-2">
          {exercisesInGym.length > 0 ? (
            <ul className="space-y-1">
              {exercisesInGym.map(ex => (
                <ExerciseListItem key={ex.id} exercise={ex} onAction={onRemove} actionIcon={<ChevronLeft className="h-4 w-4" />} isBonus={ex.is_bonus_exercise} />
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