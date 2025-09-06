"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/session-context-provider';
import { useWorkoutFlowManager } from '@/hooks/use-workout-flow-manager';
import { WorkoutSelector } from '@/components/workout-flow/workout-selector';
import { WorkoutSummaryModal } from '@/components/workout-summary/workout-summary-modal'; // Import the modal

export default function WorkoutPage() {
  const { session, supabase } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkoutId = searchParams.get('workoutId');
  const isQuickStart = !!initialWorkoutId; // Determine if it's a quick start

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summarySessionId, setSummarySessionId] = useState<string | null>(null);

  const workoutFlowManager = useWorkoutFlowManager({
    initialWorkoutId: initialWorkoutId,
    router,
  });

  const handleFinishAndShowSummary = async () => {
    const finishedSessionId = await workoutFlowManager.finishWorkoutSession();
    if (finishedSessionId) {
      setSummarySessionId(finishedSessionId);
      setShowSummaryModal(true);
    }
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
        {...workoutFlowManager} 
        onWorkoutSelect={() => {}} // No longer directly used by WorkoutSelector
        loadingWorkoutFlow={workoutFlowManager.loading}
        createWorkoutSessionInDb={workoutFlowManager.createWorkoutSessionInDb}
        finishWorkoutSession={handleFinishAndShowSummary}
        isQuickStart={isQuickStart} // Pass the new prop here
      />
      <WorkoutSummaryModal
        sessionId={summarySessionId}
        open={showSummaryModal}
        onOpenChange={setShowSummaryModal}
      />
    </div>
  );
}