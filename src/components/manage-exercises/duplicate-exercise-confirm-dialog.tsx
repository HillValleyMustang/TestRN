"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DuplicateExerciseConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  onConfirmAddAnyway: () => void;
}

export const DuplicateExerciseConfirmDialog = ({
  open,
  onOpenChange,
  exerciseName,
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
            An exercise named "<span className="font-semibold">{exerciseName}</span>" already exists in your library or the global library.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to add it again? Adding a duplicate might make your exercise list harder to manage.
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