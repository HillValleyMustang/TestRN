"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { WorkoutSelector } from '@/components/workout-flow/workout-selector';
import { WorkoutSummaryModal } from '@/components/workout-summary/workout-summary-modal';
// Removed: import { UnsavedChangesDialog } from '@/components/workout-flow/unsaved-changes-dialog'; // Dialog is now in layout
// Removed: import { WorkoutNavigationProvider } from '@/components/workout-flow/workout-aware-link'; // Provider is now in layout

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutId = searchParams.get('workoutId');
  const isQuickStart = !!initialWorkoutId; // Determine if it's a quick start

  const [summarySessionId, setSummarySessionId] = useState<string | null>(null);
  // Removed: showUnsavedChangesDialog state
  // Removed: pendingNavigationPath state

  const workoutFlowManager = useWorkoutFlowManager({
    initialWorkoutId: initialWorkoutId,
    router,
  });

  // Removed: Browser-level warning useEffect (moved to layout)
  // Removed: In-app navigation warning handlers (moved to useWorkoutFlowManager and layout)

  const handleWorkoutSelect = (workoutId: string | null) => {
    workoutFlowManager.selectWorkout(workoutId);
  };

  const handleFinishAndShowSummary = async () => {
    const finishedSessionId = await workoutFlowManager.finishWorkoutSession();
    if (finishedSessionId) {
      setSummarySessionId(finishedSessionId);
    }
  };

  return (
    // Removed: WorkoutNavigationProvider wrapper (moved to layout)
    <div className="p-2 sm:p-4">
      <header className="mb-4 text-center">
        <h1 className="text-3xl font-bold">Workout Session</h1>
        <p className="text-muted-foreground">
          Select a workout or start an ad-hoc session.
        </p>
      </header>
      <WorkoutSelector 
        {...workoutFlowManager} 
        onWorkoutSelect={handleWorkoutSelect}
        loadingWorkoutFlow={workoutFlowManager.loading}
        createWorkoutSessionInDb={workoutFlowManager.createWorkoutSessionInDb}
        finishWorkoutSession={handleFinishAndShowSummary}
        isQuickStart={isQuickStart} // Pass the new prop here
      />
      <WorkoutSummaryModal
        sessionId={summarySessionId}
        open={!!summarySessionId}
        onOpenChange={(open) => {
          if (!open) setSummarySessionId(null);
        }}
      />
    </div>
    // Removed: UnsavedChangesDialog rendering (moved to layout)
  );
}