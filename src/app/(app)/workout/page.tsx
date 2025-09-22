"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { useWorkoutFlow } from '@/components/workout-flow/workout-flow-context-provider'; // Import the context hook
import { WorkoutSelector } from '@/components/workout-flow/workout-selector';
import { WorkoutProgressBar } from '@/components/workout-flow/workout-progress-bar';
import { WorkoutSummaryModal } from '@/components/workout-summary/workout-summary-modal';
import { GymToggle } from '@/components/dashboard/gym-toggle';
import { useGym } from '@/components/gym-context-provider'; // NEW IMPORT

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutId = searchParams.get('workoutId');
  const isQuickStart = !!initialWorkoutId;

  // Use the context hook to get the shared state and functions
  const workoutFlowManager = useWorkoutFlow();
  const initialSelectionAttempted = useRef(false); // Ref to track if we've tried to select the initial workout
  const { userGyms, loadingGyms } = useGym(); // NEW: Consume useGym

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summarySessionId, setSummarySessionId] = useState<string | null>(null);

  const handleFinishAndShowSummary = async (): Promise<string | null> => {
    const finishedSessionId = await workoutFlowManager.finishWorkoutSession();
    console.log("WorkoutPage: Finished workout session. Returned ID:", finishedSessionId);
    if (finishedSessionId) {
      setSummarySessionId(finishedSessionId);
      setShowSummaryModal(true);
      // Trigger refresh for profile and achievements after workout completion
      workoutFlowManager.refreshProfile();
      workoutFlowManager.refreshAchievements();
    }
    return finishedSessionId;
  };

  // Effect to handle the initial workout selection from URL parameters
  useEffect(() => {
    // This effect should only run once on mount if an initialWorkoutId is present.
    // The ref prevents it from re-triggering on subsequent re-renders.
    if (initialWorkoutId && !initialSelectionAttempted.current) {
      initialSelectionAttempted.current = true;
      workoutFlowManager.selectWorkout(initialWorkoutId);
    }
  }, [initialWorkoutId, workoutFlowManager.selectWorkout]);


  return (
    <div className="p-2 sm:p-4">
      <header className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="w-24" /> {/* Spacer */}
          <h1 className="text-3xl font-bold text-center flex-1">Workout Session</h1>
          <div className="w-24 flex justify-end">
            {/* GymToggle is now moved out of here */}
          </div>
        </div>
        <p className="text-muted-foreground text-center">
          Select a workout or start an ad-hoc session.
        </p>
      </header>

      {/* NEW: GymToggle placement */}
      {!loadingGyms && userGyms.length > 1 && (
        <div className="flex justify-center mb-6"> {/* Added mb-6 for spacing */}
          <GymToggle />
        </div>
      )}

      <WorkoutSelector
        key={workoutFlowManager.activeWorkout?.id || 'no-workout'}
        {...workoutFlowManager}
        loadingWorkoutFlow={workoutFlowManager.loading}
        createWorkoutSessionInDb={workoutFlowManager.createWorkoutSessionInDb}
        finishWorkoutSession={handleFinishAndShowSummary}
        isQuickStart={isQuickStart}
        allAvailableExercises={workoutFlowManager.allAvailableExercises}
        updateSessionStartTime={workoutFlowManager.updateSessionStartTime}
        completedExercises={workoutFlowManager.completedExercises} // Explicitly pass as Set<string>
      />
      <WorkoutProgressBar
        exercisesForSession={workoutFlowManager.exercisesForSession}
        completedExercises={workoutFlowManager.completedExercises} // Explicitly pass as Set<string>
        isWorkoutActive={workoutFlowManager.isWorkoutActive}
      />
      <WorkoutSummaryModal
        open={showSummaryModal}
        onOpenChange={setShowSummaryModal}
        sessionId={summarySessionId}
      />
    </div>
  );
}