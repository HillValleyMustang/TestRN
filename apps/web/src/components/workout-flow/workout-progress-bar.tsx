"use client";

import React, { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn, getWorkoutColorClass } from '@/lib/utils'; // Keep web-specific utils;
import { Tables, WorkoutExercise } from '@/types/supabase';
import { Dumbbell } from 'lucide-react';

type TPath = Tables<'t_paths'>; // Import TPath type

interface WorkoutProgressBarProps {
  exercisesForSession: WorkoutExercise[];
  completedExercises: Set<string>;
  isWorkoutSessionStarted: boolean; // NEW PROP
  activeWorkout: TPath | null; // NEW PROP
}

export const WorkoutProgressBar = ({
  exercisesForSession,
  completedExercises,
  isWorkoutSessionStarted, // USE NEW PROP
  activeWorkout, // NEW PROP
}: WorkoutProgressBarProps) => {
  const totalExercises = exercisesForSession.length;
  const completedCount = completedExercises.size;

  const progressPercentage = useMemo(() => {
    if (totalExercises === 0) return 0;
    return (completedCount / totalExercises) * 100;
  }, [completedCount, totalExercises]);

  if (!isWorkoutSessionStarted || totalExercises === 0) { // USE NEW PROP FOR VISIBILITY
    return null; // Don't render if workout session hasn't started or no exercises
  }

  const workoutName = activeWorkout?.template_name || 'Ad Hoc Workout';
  const progressBarGradientClasses = getWorkoutColorClass(workoutName, 'gradient');

  // Ensure progressBarGradientClasses is an object with 'from' and 'to' properties
  const fromClass = typeof progressBarGradientClasses === 'object' ? progressBarGradientClasses.from : 'from-primary';
  const toClass = typeof progressBarGradientClasses === 'object' ? progressBarGradientClasses.to : 'to-action';

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 p-4 bg-background/80 backdrop-blur-md border-t",
        "transition-transform duration-500 ease-out",
        isWorkoutSessionStarted ? "translate-y-0 opacity-100" : "translate-y-full opacity-0" // Use new prop for animation
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
          <Progress 
            value={progressPercentage} 
            className="h-2 bg-muted" 
            indicatorClassName={cn("bg-gradient-to-r", fromClass, toClass)} // ADDED bg-gradient-to-r
          />
        </div>
      </div>
    </div>
  );
};