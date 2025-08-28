"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { WorkoutSelector } from '@/components/workout-flow/workout-selector'; // Import the new component

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutId = searchParams.get('workoutId');

  // State for selected workout ID, managed by the page component
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(initialWorkoutId || null);

  // Initialize workout flow manager with the selected workout ID
  const workoutFlowManagerProps = useWorkoutFlowManager({
    initialWorkoutId: selectedWorkoutId, // Pass selectedWorkoutId to the hook
    session,
    supabase,
    router,
  });

  // Effect to re-initialize workout flow when selectedWorkoutId changes
  useEffect(() => {
    if (session) {
      workoutFlowManagerProps.selectWorkout(selectedWorkoutId);
    }
  }, [selectedWorkoutId, session]); // Depend on selectedWorkoutId and session

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