"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn, getWorkoutColorClass } from '@/lib/utils';

interface WorkoutSessionHeaderProps {
  tPathName: string;
  currentExerciseCount: number;
  totalExercises: number;
}

export const WorkoutSessionHeader = ({ tPathName, currentExerciseCount, totalExercises }: WorkoutSessionHeaderProps) => {
  const router = useRouter();
  const workoutColorClass = getWorkoutColorClass(tPathName, 'text');
  const progressBarGradientClasses = getWorkoutColorClass(tPathName, 'gradient');
  const progressPercentage = totalExercises > 0 ? (currentExerciseCount / totalExercises) * 100 : 0;

  // Ensure progressBarGradientClasses is an object with 'from' and 'to' properties
  const fromClass = typeof progressBarGradientClasses === 'object' ? progressBarGradientClasses.from : 'from-primary';
  const toClass = typeof progressBarGradientClasses === 'object' ? progressBarGradientClasses.to : 'to-action';


  return (
    <header className="sticky top-0 z-20 w-full bg-background/95 backdrop-blur-md border-b p-4 sm:px-6 sm:py-4">
      <div className="flex justify-between items-center mb-2">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className={cn("text-xl font-bold text-center flex-1", workoutColorClass)}>{tPathName}</h1>
        <div className="w-16"></div> {/* Spacer to balance the back button */}
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={cn("h-2 rounded-full transition-all duration-500 ease-out", fromClass, toClass)}
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      <p className="text-sm text-muted-foreground text-center mt-1">
        Exercise {currentExerciseCount} of {totalExercises}
      </p>
    </header>
  );
};