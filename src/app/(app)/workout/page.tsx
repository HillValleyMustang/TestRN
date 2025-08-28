"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';

import { WorkoutSelector } from '@/components/workout-flow/workout-selector'; // Import WorkoutSelector as a named export

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutId = searchParams.get('workoutId');

  // State for selected workout ID, managed by the page component
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null); // Start with no workout selected

  const workoutFlowManagerProps = useWorkoutFlowManager({ // Pass selectedWorkoutId to manager
    activeWorkoutId: selectedWorkoutId, // Pass selectedWorkoutId as activeWorkoutId
    session,
    supabase,
    router,
  });

  // Update selected workout ID when workoutFlowManagerProps.activeWorkout changes
  useEffect(() => {
    // If the manager has an active workout, set it as selected.
    // If the manager resets (activeWorkout becomes null), clear the selection.
    if (workoutFlowManagerProps.activeWorkout?.id) {
      setSelectedWorkoutId(workoutFlowManagerProps.activeWorkout.id); // Set to the ID of the active workout
    } else if (workoutFlowManagerProps.activeWorkout === null) {
      setSelectedWorkoutId(null);
    }
  }, [workoutFlowManagerProps.activeWorkout, selectedWorkoutId]);

  // Render the WorkoutSelector component with the props
  return (
    <div className="p-2 sm:p-4">
      <WorkoutSelector 
        {...workoutFlowManagerProps} 
        selectedWorkoutId={selectedWorkoutId}
        onWorkoutSelect={setSelectedWorkoutId}
        loadingWorkoutFlow={workoutFlowManagerProps.loading} // Pass loading state
      />
      <MadeWithDyad />
    </div>
  );
}