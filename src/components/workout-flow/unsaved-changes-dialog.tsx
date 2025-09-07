"use client";

import React from 'react';
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
import { Settings, TriangleAlert } from 'lucide-react'; // Import Settings icon
import { Button } from '@/components/ui/button'; // Import Button
import { Tables } from '@/types/supabase'; // Import Tables for TPath type

type TPath = Tables<'t_paths'>;

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmLeave: () => void;
  onCancelLeave: () => void;
  activeWorkout: TPath | null; // New prop
  onOpenEditWorkoutDialog: (workoutId: string, workoutName: string) => void; // New prop
}

export const UnsavedChangesDialog = ({
  open,
  onOpenChange,
  onConfirmLeave,
  onCancelLeave,
  activeWorkout,
  onOpenEditWorkoutDialog,
}: UnsavedChangesDialogProps) => {
  const handleManageWorkoutClick = () => {
    if (activeWorkout && activeWorkout.id !== 'ad-hoc') {
      onOpenEditWorkoutDialog(activeWorkout.id, activeWorkout.template_name);
    }
    // The dialog itself should not close here, as the user might still want to leave or go back.
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
          {activeWorkout && activeWorkout.id !== 'ad-hoc' && (
            <Button 
              variant="outline" 
              onClick={handleManageWorkoutClick} 
              className="flex-1"
            >
              <Settings className="h-4 w-4 mr-2" /> Manage Workout
            </Button>
          )}
          <AlertDialogAction onClick={onConfirmLeave} className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Continue and Exit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};