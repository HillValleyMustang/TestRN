"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { useWorkoutFlow } from '@/components/workout-flow/workout-flow-context-provider'; // Import the context hook
import { WorkoutSelector } from '@/components/workout-flow/workout-selector';
import { WorkoutProgressBar } from '@/components/workout-flow/workout-progress-bar';
import { WorkoutSummaryModal } from '@/components/workout-summary/workout-summary-modal';
import { GymToggle } from '@/components/dashboard/gym-toggle';

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutId = searchParams.get('workoutId');
  const isQuickStart = !!initialWorkoutId;

  // Use the context hook to get the shared state and functions
  const workoutFlowManager = useWorkoutFlow();

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
    // Only select if a workout isn't active AND a selection isn't already pending
    if (
      initialWorkoutId &&
      !workoutFlowManager.activeWorkout &&
      !workoutFlowManager.loading &&
      !workoutFlowManager.pendingWorkoutIdToSelect
    ) {
      workoutFlowManager.selectWorkout(initialWorkoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialWorkoutId,
    workoutFlowManager.activeWorkout,
    workoutFlowManager.loading,
    workoutFlowManager.pendingWorkoutIdToSelect, // Add new dependency
  ]);


  return (
    <div className="p-2 sm:p-4">
      <header className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="w-24" /> {/* Spacer */}
          <h1 className="text-3xl font-bold text-center flex-1">Workout Session</h1>
          <div className="w-24 flex justify-end">
            <GymToggle />
          </div>
        </div>
        <p className="text-muted-foreground text-center">
          Select a workout or start an ad-hoc session.
        </p>
      </header>
      <WorkoutSelector
        key={workoutFlowManager.activeWorkout?.id || 'no-workout'}
        {...workoutFlowManager}
        loadingWorkoutFlow={workoutFlowManager.loading}
        createWorkoutSessionInDb={workoutFlowManager.createWorkoutSessionInDb}
        finishWorkoutSession={handleFinishAndShowSummary}
        isQuickStart={isQuickStart}
        allAvailableExercises={workoutFlowManager.allAvailableExercises}
        setAllAvailableExercises={workoutFlowManager.setAllAvailableExercises}
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