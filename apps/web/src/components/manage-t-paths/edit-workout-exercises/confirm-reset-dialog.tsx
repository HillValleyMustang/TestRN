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

interface ConfirmResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutName: string;
  onConfirm: () => void;
}

export const ConfirmResetDialog = ({
  open,
  onOpenChange,
  workoutName,
  onConfirm,
}: ConfirmResetDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Reset to Defaults</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to reset the exercises for "<span className="font-semibold">{workoutName}</span>" to its default configuration? This will remove all custom exercises and reintroduce the original set based on your preferred session length. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Reset to Defaults</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};