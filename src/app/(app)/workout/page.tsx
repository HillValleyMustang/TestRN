"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { WorkoutSelector } from '@/components/workout-flow/workout-selector';

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutIdFromParams = searchParams.get('workoutId');

  const [isWorkoutSelected, setIsWorkoutSelected] = useState(false);

  const {
    activeWorkout,
    exercisesForSession,
    exercisesWithSets,
    allAvailableExercises,
    loading,
    error,
    currentSessionId,
    sessionStartTime,
    completedExercises,
    selectWorkout,
    addExerciseToSession,
    removeExerciseFromSession,
    substituteExercise,
    updateSessionStartTime,
    markExerciseAsCompleted,
    resetWorkoutSession,
    updateExerciseSets,
  } = useWorkoutFlowManager({ initialWorkoutId: initialWorkoutIdFromParams, session, supabase, router });

  useEffect(() => {
    if (initialWorkoutIdFromParams && !activeWorkout && !loading && !error) {
      selectWorkout(initialWorkoutIdFromParams);
    }
  }, [initialWorkoutIdFromParams, activeWorkout, loading, error, selectWorkout]);

  useEffect(() => {
    setIsWorkoutSelected(!!activeWorkout && activeWorkout.id !== null);
  }, [activeWorkout]);

  const handleWorkoutSelect = useCallback(async (workoutId: string | null) => {
    await selectWorkout(workoutId);
  }, [selectWorkout]);

  const handleBackToSelection = () => {
    resetWorkoutSession();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading workout...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-destructive p-4 sm:p-8">
        <Dumbbell className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Error Loading Workout</h2>
        <p className="text-lg text-center mb-4">{error}</p>
        <Button onClick={handleBackToSelection}>Back to Workout Selection</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:px-4 sm:py-4 md:px-6 lg:px-8">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Start Your Workout</h1>
        <p className="text-muted-foreground">
          Choose an ad-hoc session or one of your personalised Transformation Paths.
        </p>
      </header>
      
      <WorkoutSelector 
        onWorkoutSelect={handleWorkoutSelect} 
        selectedWorkoutId={initialWorkoutIdFromParams}
        // Pass all the workout flow manager props
        activeWorkout={activeWorkout}
        exercisesForSession={exercisesForSession}
        exercisesWithSets={exercisesWithSets}
        allAvailableExercises={allAvailableExercises}
        currentSessionId={currentSessionId}
        sessionStartTime={sessionStartTime}
        completedExercises={completedExercises}
        addExerciseToSession={addExerciseToSession}
        removeExerciseFromSession={removeExerciseFromSession}
        substituteExercise={substituteExercise}
        updateSessionStartTime={updateSessionStartTime}
        markExerciseAsCompleted={markExerciseAsCompleted}
        resetWorkoutSession={resetWorkoutSession}
        updateExerciseSets={updateExerciseSets}
      />
      
      <MadeWithDyad />
    </div>
  );
}