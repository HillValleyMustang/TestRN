"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { WorkoutSelector } from '@/components/workout-flow/workout-selector';

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutId = searchParams.get('workoutId');

  const workoutFlowManager = useWorkoutFlowManager({
    initialWorkoutId: initialWorkoutId,
    router,
  });

  const handleWorkoutSelect = (workoutId: string | null) => {
    workoutFlowManager.selectWorkout(workoutId);
  };

  return (
    <div className="p-2 sm:p-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-center">Workout Session</h1>
        <p className="text-muted-foreground text-center">
          Select a workout or start an ad-hoc session.
        </p>
      </header>
      <WorkoutSelector 
        {...workoutFlowManager} 
        selectedWorkoutId={workoutFlowManager.activeWorkout?.id || null}
        onWorkoutSelect={handleWorkoutSelect}
        loadingWorkoutFlow={workoutFlowManager.loading}
        createWorkoutSessionInDb={workoutFlowManager.createWorkoutSessionInDb}
        finishWorkoutSession={workoutFlowManager.finishWorkoutSession} // Pass the new function
      />
      
    </div>
  );
}