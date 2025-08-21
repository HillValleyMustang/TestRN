"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DuplicateExerciseConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  duplicateLocation: 'My Exercises' | 'Global Library'; // New prop for dynamic text
  onConfirmAddAnyway: () => void;
}

export const DuplicateExerciseConfirmDialog = ({
  open,
  onOpenChange,
  exerciseName,
  duplicateLocation,
  onConfirmAddAnyway,
}: DuplicateExerciseConfirmDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-yellow-600">
            <AlertTriangle className="h-5 w-5 mr-2" /> Exercise Already Exists!
          </DialogTitle>
          <DialogDescription>
            It looks like "<span className="font-semibold">{exerciseName}</span>" is already a saved exercise within {duplicateLocation}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Adding it again will create a duplicate.
          </p>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirmAddAnyway} className="flex-1">
            Add Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};