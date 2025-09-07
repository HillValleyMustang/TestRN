"use client";

import React, { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { WorkoutExercise } from '@/types/supabase';
import { Dumbbell } from 'lucide-react';

interface WorkoutProgressBarProps {
  exercisesForSession: WorkoutExercise[];
  completedExercises: Set<string>;
  isWorkoutActive: boolean;
}

export const WorkoutProgressBar = ({
  exercisesForSession,
  completedExercises,
  isWorkoutActive,
}: WorkoutProgressBarProps) => {
  const totalExercises = exercisesForSession.length;
  const completedCount = completedExercises.size;

  const progressPercentage = useMemo(() => {
    if (totalExercises === 0) return 0;
    return (completedCount / totalExercises) * 100;
  }, [completedCount, totalExercises]);

  if (!isWorkoutActive || totalExercises === 0) {
    return null; // Don't render if no workout is active or no exercises
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 p-4 bg-background/80 backdrop-blur-md border-t",
        "transition-transform duration-500 ease-out",
        isWorkoutActive ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      )}
    >
      <div className="max-w-2xl mx-auto flex items-center gap-4">
        <Dumbbell className="h-6 w-6 text-primary flex-shrink-0" />
        <div className="flex-grow">
          <div className="flex justify-between text-sm font-medium mb-1">
            <span className="text-muted-foreground">
              Exercise {completedCount} of {totalExercises}
            </span>
            <span className="text-primary">{Math.round(progressPercentage)}% Complete</span>
          </div>
          <Progress value={progressPercentage} className="h-2 bg-muted" indicatorClassName="bg-gradient-to-r from-primary to-action" />
        </div>
      </div>
    </div>
  );
};