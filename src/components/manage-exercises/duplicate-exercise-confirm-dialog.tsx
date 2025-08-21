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
        <DialogHeader className="text-center">
          <DialogTitle className="flex flex-col items-center text-yellow-600 text-2xl font-bold mb-2">
            <AlertTriangle className="h-10 w-10 mb-2" /> 
            Exercise Already Exists!
          </DialogTitle>
          <DialogDescription className="text-base text-foreground">
            It looks like "<span className="font-bold text-primary">{exerciseName}</span>" is already a saved exercise within <span className="font-bold text-primary">{duplicateLocation}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Adding it again will create a duplicate entry in your personal exercise library.
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