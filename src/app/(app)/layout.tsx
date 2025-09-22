"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileFooterNav } from "@/components/layout/mobile-footer-nav";
import { useWorkoutFlow } from "@/components/workout-flow/workout-flow-context-provider"; // Import the context hook
import { WorkoutFlowProvider } from "@/components/workout-flow/workout-flow-context-provider"; // Import the provider
import { useEffect } from "react";
import { UnsavedChangesDialog } from "@/components/workout-flow/unsaved-changes-dialog";
import { EditWorkoutExercisesDialog } from "@/components/manage-t-paths/edit-workout-exercises-dialog";
import { GymContextProvider } from "@/components/gym-context-provider";
import { LoadingOverlay } from "@/components/loading-overlay"; // NEW: Import LoadingOverlay

// This component now consumes the context provided by WorkoutFlowProvider
function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const workoutFlowManager = useWorkoutFlow(); // Use the context hook

  // --- Browser-level warning (for page close/refresh/browser navigation) ---
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (workoutFlowManager.isWorkoutActive && workoutFlowManager.hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = ''; // Required for Chrome to show the prompt
        return ''; // Standard for other browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [workoutFlowManager.isWorkoutActive, workoutFlowManager.hasUnsavedChanges]);
  // --- End Browser-level warning ---

  return (
    <>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <Sidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <Header isGeneratingPlan={workoutFlowManager.isGeneratingPlan} />
          <main className="flex-1 p-2 sm:px-4 sm:py-0 pb-20 sm:pb-2">{children}</main>
        </div>
        <MobileFooterNav />
      </div>
      <UnsavedChangesDialog
        open={workoutFlowManager.showUnsavedChangesDialog}
        onOpenChange={workoutFlowManager.handleCancelLeave}
        onConfirmLeave={workoutFlowManager.handleConfirmLeave}
        onCancelLeave={workoutFlowManager.handleCancelLeave}
        activeWorkout={workoutFlowManager.activeWorkout}
        onOpenEditWorkoutDialog={workoutFlowManager.handleOpenEditWorkoutDialog}
      />
      {workoutFlowManager.selectedWorkoutToEdit && (
        <EditWorkoutExercisesDialog
          open={workoutFlowManager.isEditWorkoutDialogOpen}
          onOpenChange={workoutFlowManager.setIsEditWorkoutDialogOpen}
          workoutId={workoutFlowManager.selectedWorkoutToEdit.id}
          workoutName={workoutFlowManager.selectedWorkoutToEdit.name}
          onSaveSuccess={workoutFlowManager.handleEditWorkoutSaveSuccess}
        />
      )}
      {/* NEW: Global LoadingOverlay for plan generation */}
      <LoadingOverlay 
        isOpen={workoutFlowManager.isGeneratingPlan} 
        title="Updating Workout Plans" 
        description="Please wait while your workout plans are being regenerated to reflect your new preferences." 
      />
    </>
  );
}

// The main export now wraps everything in the correct provider order
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GymContextProvider>
      <WorkoutFlowProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </WorkoutFlowProvider>
    </GymContextProvider>
  );
}