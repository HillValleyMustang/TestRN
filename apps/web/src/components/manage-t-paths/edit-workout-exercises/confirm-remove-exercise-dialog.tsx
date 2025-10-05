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

interface ConfirmRemoveExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseToRemove: { name: string } | null;
  onConfirm: () => void;
}

export const ConfirmRemoveExerciseDialog = ({
  open,
  onOpenChange,
  exerciseToRemove,
  onConfirm,
}: ConfirmRemoveExerciseDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Removal</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove "<span className="font-semibold">{exerciseToRemove?.name}</span>" from this workout? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};