"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { WorkoutSelector } from '@/components/workout-flow/workout-selector';

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutId = searchParams.get('workoutId');

  const workoutFlowManager = useWorkoutFlowManager({
    initialWorkoutId: initialWorkoutId,
    session,
    supabase,
    router,
  });

  const handleWorkoutSelect = (workoutId: string | null) => {
    workoutFlowManager.selectWorkout(workoutId);
  };

  return (
    <div className="p-2 sm:p-4">
      <WorkoutSelector 
        {...workoutFlowManager} 
        selectedWorkoutId={workoutFlowManager.activeWorkout?.id || null}
        onWorkoutSelect={handleWorkoutSelect}
        loadingWorkoutFlow={workoutFlowManager.loading}
        createWorkoutSessionInDb={workoutFlowManager.createWorkoutSessionInDb}
        finishWorkoutSession={workoutFlowManager.finishWorkoutSession} // Pass the new function
      />
      <MadeWithDyad />
    </div>
  );
}