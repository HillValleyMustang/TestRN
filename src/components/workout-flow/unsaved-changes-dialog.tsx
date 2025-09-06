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
import { TriangleAlert } from 'lucide-react';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmLeave: () => void;
  onCancelLeave: () => void;
}

export const UnsavedChangesDialog = ({
  open,
  onOpenChange,
  onConfirmLeave,
  onCancelLeave,
}: UnsavedChangesDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center text-yellow-600">
            <TriangleAlert className="h-5 w-5 mr-2" /> Unsaved Workout Progress
          </AlertDialogTitle>
          <AlertDialogDescription>
            Wait! Continuing will erase current workout data. Are you sure you want to leave?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancelLeave}>Back to Workout</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Continue and Exit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};