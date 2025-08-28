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

  const workoutFlowManagerProps = useWorkoutFlowManager({
    initialWorkoutId: initialWorkoutId,
    session,
    supabase,
    router,
  });

  const handleWorkoutSelect = (workoutId: string | null) => {
    const currentSelectedId = workoutFlowManagerProps.activeWorkout?.id;
    const newWorkoutId = currentSelectedId === workoutId ? null : workoutId;
    workoutFlowManagerProps.selectWorkout(newWorkoutId);
  };

  return (
    <div className="p-2 sm:p-4">
      <WorkoutSelector 
        {...workoutFlowManagerProps} 
        selectedWorkoutId={workoutFlowManagerProps.activeWorkout?.id || null}
        onWorkoutSelect={handleWorkoutSelect}
        loadingWorkoutFlow={workoutFlowManagerProps.loading}
      />
      <MadeWithDyad />
    </div>
  );
}