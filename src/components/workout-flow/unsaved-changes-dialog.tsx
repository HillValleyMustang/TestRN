"use client";

import React, { useEffect } from 'react'; // Import useEffect
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TriangleAlert, LayoutTemplate } from 'lucide-react'; // Import LayoutTemplate

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmLeave: () => void;
  onCancelLeave: () => void;
  onManageWorkouts: (workoutId: string, workoutName: string) => void; // Updated prop signature
  activeWorkoutId: string | null; // New prop
  activeWorkoutName: string | null; // New prop
}

export const UnsavedChangesDialog = ({
  open,
  onOpenChange,
  onConfirmLeave,
  onCancelLeave,
  onManageWorkouts,
  activeWorkoutId, // Destructure new prop
  activeWorkoutName, // Destructure new prop
}: UnsavedChangesDialogProps) => {
  useEffect(() => {
    if (open) {
      console.log("UnsavedChangesDialog opened.");
      console.log("activeWorkoutId:", activeWorkoutId);
      console.log("activeWorkoutName:", activeWorkoutName);
      console.log("Should 'Manage Workout' button be visible?", activeWorkoutId && activeWorkoutName && activeWorkoutId !== 'ad-hoc');
    }
  }, [open, activeWorkoutId, activeWorkoutName]);

  const handleManageWorkoutsClick = () => {
    if (activeWorkoutId && activeWorkoutName) {
      onManageWorkouts(activeWorkoutId, activeWorkoutName);
    } else {
      // Fallback if for some reason active workout details are missing
      onConfirmLeave(); // Treat as a regular exit
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-yellow-600">
            <TriangleAlert className="h-5 w-5 mr-2" /> Unsaved Workout Progress
          </AlertDialogTitle>
          <AlertDialogDescription>
            You have an active workout session with unsaved changes. If you leave now, your progress for this workout will be lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onCancelLeave} className="flex-1">Go back to Workout</AlertDialogCancel>
          {activeWorkoutId && activeWorkoutName && activeWorkoutId !== 'ad-hoc' && ( // Only show if a specific workout is active
            <AlertDialogAction onClick={handleManageWorkoutsClick} className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80">
              <LayoutTemplate className="h-4 w-4 mr-2" /> Manage Workout
            </AlertDialogAction>
          )}
          <AlertDialogAction onClick={onConfirmLeave} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Continue and Exit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};