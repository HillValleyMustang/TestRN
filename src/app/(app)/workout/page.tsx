"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { WorkoutSelector } from '@/components/workout-flow/workout-selector';
import { WorkoutProgressBar } from '@/components/workout-flow/workout-progress-bar';
import { WorkoutSummaryModal } from '@/components/workout-summary/workout-summary-modal'; // Import the modal

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutId = searchParams.get('workoutId');
  const isQuickStart = !!initialWorkoutId;

  const workoutFlowManager = useWorkoutFlowManager({
    initialWorkoutId: initialWorkoutId,
    router,
  });

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summarySessionId, setSummarySessionId] = useState<string | null>(null);

  const handleFinishAndShowSummary = async (): Promise<string | null> => { // Explicitly define return type
    const finishedSessionId = await workoutFlowManager.finishWorkoutSession();
    console.log("WorkoutPage: Finished workout session. Returned ID:", finishedSessionId);
    if (finishedSessionId) {
      setSummarySessionId(finishedSessionId);
      setShowSummaryModal(true);
      // Trigger refresh for profile and achievements after workout completion
      workoutFlowManager.refreshProfile();
      workoutFlowManager.refreshAchievements();
    }
    return finishedSessionId; // Return the session ID
  };

  return (
    <div className="p-2 sm:p-4">
      <header className="mb-4 text-center">
        <h1 className="text-3xl font-bold">Workout Session</h1>
        <p className="text-muted-foreground">
          Select a workout or start an ad-hoc session.
        </p>
      </header>
      <WorkoutSelector
        key={workoutFlowManager.activeWorkout?.id || 'no-workout'}
        {...workoutFlowManager}
        allAvailableExercises={workoutFlowManager.adHocAvailableExercises} // Use the new filtered list
        // Removed onWorkoutSelect as it's no longer a valid prop
        loadingWorkoutFlow={workoutFlowManager.loading}
        createWorkoutSessionInDb={workoutFlowManager.createWorkoutSessionInDb}
        finishWorkoutSession={handleFinishAndShowSummary} // Use the local handler
        isQuickStart={isQuickStart}
        setAllAvailableExercises={workoutFlowManager.setAllAvailableExercises} // Pass the setter
        updateSessionStartTime={workoutFlowManager.updateSessionStartTime}
      />
      <WorkoutProgressBar
        exercisesForSession={workoutFlowManager.exercisesForSession}
        completedExercises={workoutFlowManager.completedExercises}
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