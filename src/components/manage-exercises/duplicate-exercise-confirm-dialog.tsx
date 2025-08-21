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
          <DialogTitle className="flex items-center justify-center text-yellow-600 mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" /> Exercise Already Exists!
          </DialogTitle>
          <DialogDescription className="text-center">
            It looks like "<span className="font-semibold">{exerciseName}</span>" is already a saved exercise within {duplicateLocation}.
            <p className="mt-1">Adding it again will create a duplicate.</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-6"> {/* Increased margin-top for gap */}
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