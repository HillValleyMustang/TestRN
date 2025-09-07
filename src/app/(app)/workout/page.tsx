"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { WorkoutSelector } from '@/components/workout-flow/workout-selector';
import { WorkoutProgressBar } from '@/components/workout-flow/workout-progress-bar'; // Import the new progress bar

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutId = searchParams.get('workoutId');
  const isQuickStart = !!initialWorkoutId; // Determine if it's a quick start

  const workoutFlowManager = useWorkoutFlowManager({
    initialWorkoutId: initialWorkoutId,
    router,
  });

  const handleFinishAndShowSummary = async () => {
    const finishedSessionId = await workoutFlowManager.finishWorkoutSession();
    console.log("WorkoutPage: Finished workout session. Returned ID:", finishedSessionId);
    // The navigation to the summary page is now handled directly within useWorkoutFlowManager's finishWorkoutSession
  };

  return (
    <div className="p-2 sm:p-4">
      <header className="mb-4 text-center">
        <h1 className="text-3xl font-bold">Workout Session</h1>
        <p className="text-muted-foreground">
          Select a workout or start an ad-hoc session.
        </p>
      </header>
      {/* Add key prop here */}
      <WorkoutSelector 
        key={workoutFlowManager.activeWorkout?.id || 'no-workout'}
        {...workoutFlowManager} 
        onWorkoutSelect={() => {}} // No longer directly used by WorkoutSelector
        loadingWorkoutFlow={workoutFlowManager.loading}
        createWorkoutSessionInDb={workoutFlowManager.createWorkoutSessionInDb}
        finishWorkoutSession={handleFinishAndShowSummary}
        isQuickStart={isQuickStart} // Pass the new prop here
        allAvailableExercises={workoutFlowManager.allAvailableExercises} // Pass allAvailableExercises
        updateSessionStartTime={workoutFlowManager.updateSessionStartTime} // Pass updateSessionStartTime
      />
      <WorkoutProgressBar
        exercisesForSession={workoutFlowManager.exercisesForSession}
        completedExercises={workoutFlowManager.completedExercises}
        isWorkoutActive={workoutFlowManager.isWorkoutActive}
      />
    </div>
  );
}