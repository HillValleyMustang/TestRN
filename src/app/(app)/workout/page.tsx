"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { WorkoutSelector } from '@/components/workout-flow/workout-selector';
import { WorkoutSummaryModal } from '@/components/workout-summary/workout-summary-modal';
import { UnsavedChangesDialog } from '@/components/workout-flow/unsaved-changes-dialog'; // Import the new dialog
import { WorkoutNavigationProvider } from '@/components/workout-flow/workout-aware-link'; // Import the provider

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutId = searchParams.get('workoutId');

  const [summarySessionId, setSummarySessionId] = useState<string | null>(null);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingNavigationPath, setPendingNavigationPath] = useState<string | null>(null);

  const workoutFlowManager = useWorkoutFlowManager({
    initialWorkoutId: initialWorkoutId,
    router,
  });

  const { isWorkoutActive, hasUnsavedChanges, resetWorkoutSession } = workoutFlowManager;

  // --- Browser-level warning (for page close/refresh/browser navigation) ---
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isWorkoutActive) {
        event.preventDefault();
        event.returnValue = ''; // Required for Chrome to show the prompt
        return ''; // Standard for other browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isWorkoutActive]);

  // --- In-app navigation warning ---
  const handleNavigationAttempt = useCallback((path: string): boolean => {
    if (isWorkoutActive) {
      setPendingNavigationPath(path);
      setShowUnsavedChangesDialog(true);
      return true; // Block navigation
    }
    return false; // Allow navigation
  }, [isWorkoutActive]);

  const handleConfirmLeave = useCallback(async () => {
    setShowUnsavedChangesDialog(false);
    if (pendingNavigationPath) {
      await resetWorkoutSession(); // Discard current workout progress
      router.push(pendingNavigationPath);
      setPendingNavigationPath(null);
    }
  }, [pendingNavigationPath, router, resetWorkoutSession]);

  const handleCancelLeave = useCallback(() => {
    setShowUnsavedChangesDialog(false);
    setPendingNavigationPath(null);
  }, []);

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
    <WorkoutNavigationProvider handleNavigationAttempt={handleNavigationAttempt}>
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
        />
      </div>
      {summarySessionId && (
        <WorkoutSummaryModal
          sessionId={summarySessionId}
          open={!!summarySessionId}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSummarySessionId(null);
              workoutFlowManager.refreshAllData(); // Refresh data when summary is closed
            }
          }}
        />
      )}
      <UnsavedChangesDialog
        open={showUnsavedChangesDialog}
        onOpenChange={setShowUnsavedChangesDialog}
        onConfirmLeave={handleConfirmLeave}
        onCancelLeave={handleCancelLeave}
      />
    </WorkoutNavigationProvider>
  );
}