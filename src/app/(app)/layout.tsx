"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileFooterNav } from "@/components/layout/mobile-footer-nav";
import { WorkoutNavigationProvider } from "@/components/workout-flow/workout-aware-link";
import { useWorkoutFlowManager } from "@/hooks/use-workout-flow-manager";
import { useRouter } from "next/navigation";
import { useEffect } from "react"; // Import useEffect
import { UnsavedChangesDialog } from "@/components/workout-flow/unsaved-changes-dialog"; // Import the dialog
import { EditWorkoutExercisesDialog } from "@/components/manage-t-paths/edit-workout-exercises-dialog"; // Import the dialog

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const workoutFlowManager = useWorkoutFlowManager({ router });

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
    <WorkoutNavigationProvider promptBeforeNavigation={workoutFlowManager.promptBeforeNavigation}>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <Sidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
          <Header />
          <main className="flex-1 p-2 sm:px-4 sm:py-0 pb-20 sm:pb-2">{children}</main>
        </div>
        <MobileFooterNav />
      </div>
      <UnsavedChangesDialog
        open={workoutFlowManager.showUnsavedChangesDialog}
        onOpenChange={workoutFlowManager.handleCancelLeave} // Allow closing with escape/outside click
        onConfirmLeave={workoutFlowManager.handleConfirmLeave}
        onCancelLeave={workoutFlowManager.handleCancelLeave}
        onManageWorkouts={workoutFlowManager.openEditWorkoutDialog} // Pass the new handler
        activeWorkoutId={workoutFlowManager.activeWorkout?.id || null} // Pass active workout ID
        activeWorkoutName={workoutFlowManager.activeWorkout?.template_name || null} // Pass active workout name
      />
      {workoutFlowManager.editWorkoutDetails && (
        <EditWorkoutExercisesDialog
          open={workoutFlowManager.showEditWorkoutDialog}
          onOpenChange={workoutFlowManager.closeEditWorkoutDialog}
          workoutId={workoutFlowManager.editWorkoutDetails.id}
          workoutName={workoutFlowManager.editWorkoutDetails.name}
          onSaveSuccess={workoutFlowManager.closeEditWorkoutDialog} // Refresh data after save
        />
      )}
    </WorkoutNavigationProvider>
  );
}